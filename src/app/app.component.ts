import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import * as configcat from 'configcat-js';
import { IConfigCatClient } from 'configcat-common/lib/ConfigCatClient';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { uniqueNamesGenerator, names } from 'unique-names-generator';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  paramMapSubscription: Subscription;
  loading = true;
  showHeader = true;

  apiKey: string;
  configCatClient: IConfigCatClient;
  allKeys: string[] = [];
  configCatClientInitializing = false;
  featureFlagKey: string;
  featureFlagKeyInitialized = false;
  baseUrl: string;
  apiKeyFormGroup = this.formBuilder.group({ apiKey: ['', Validators.required] });
  featureFlagKeyFormGroup = this.formBuilder.group({ featureFlagKey: ['', Validators.required] });;
  userCountFormGroup = this.formBuilder.group({ userCount: [20, Validators.required] });
  startupData: StartupData = {
    domains: [
      { emailDomain: '@mycompany.com', userCount: 10 },
      { emailDomain: '@sensitive.com', userCount: 10 },
    ],
    countries: ['US', 'UK', 'Canada'],
    subscriptionTypes: ['Free', 'Pro', 'Enterprise']
  };
  emails: string[] = [];
  users: User[] = [];
  greenCounter = 0;
  redCounter = 0;

  getRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  constructor(
    private route: ActivatedRoute,
    private formBuilder: NonNullableFormBuilder
  ) {

  }
  ngOnInit(): void {
    this.paramMapSubscription = this.route.queryParamMap.subscribe(params => {

      this.apiKey = params.get('sdkKey');
      this.baseUrl = params.get('baseUrl');
      this.featureFlagKey = params.get('featureFlagKey');
      let hideControls = params.get('hideControls');

      if (!this.featureFlagKey) { this.featureFlagKey = ''; }
      this.apiKeyFormGroup.patchValue({ apiKey: this.apiKey });
      this.featureFlagKeyFormGroup.patchValue({ featureFlagKey: this.featureFlagKey });
      this.userCountFormGroup.reset();

      if (this.apiKey) {
        // at this point, we have everything to try to init the client
        this.initializeConfigCatClient();
        let x = this.featureFlagKeyInitialized;
        if (this.featureFlagKey && hideControls === "true") {
          // it's very likely the app is configured through the url, and the user wants to use it that way
          this.showHeader = false;
        }
      }

      this.loading = false;

      this.generateUsers();
    });
  }

  generateUsers() {
    this.users = [];
    this.emails = [];
    const userCount = this.userCountFormGroup.valid ? this.userCountFormGroup.controls.userCount.value : 20;
    this.startupData.domains.forEach(domain => {
      this.generateAndAddEmailAddresses(domain.emailDomain, domain.userCount);
    });
    this.generateAndAddEmailAddresses('@example.com', userCount);

    this.users = this.emails.map(email => {
      return {
        userObject: {
          identifier: uuidv4(),
          email,
          country: this.getRandom(this.startupData.countries),
          custom: { subscriptionType: this.getRandom(this.startupData.subscriptionTypes) }
        }, featureEnabled: false
      };
    });
    if (this.apiKey) { this.handleFeatureFlags(); }
  }

  generateAndAddEmailAddresses(domain: string, count: number) {
    for (let index = 0; index < count; index++) {
      const randomName: string = uniqueNamesGenerator({
        dictionaries: [names],
        length: 1
      });
      randomName.replace(/\s/g, '');
      this.emails.push(`${randomName.toLowerCase()}${domain}`);
    }
  }

  initializeConfigCatClient() {
    if (!this.apiKeyFormGroup.valid) {
      return;
    }

    this.apiKey = this.apiKeyFormGroup.controls.apiKey.value;

    this.configCatClientInitializing = true;
    if (this.configCatClient) {
      this.configCatClient.dispose();
    }
    this.configCatClient = configcat.getClient(this.apiKey, configcat.PollingMode.AutoPoll, {
      pollIntervalSeconds: 1,
      setupHooks: (hooks) =>
        hooks.on('configChanged', () => {
          this.refresh();
          this.handleFeatureFlags();
        }),
      baseUrl: this.baseUrl
    });

    this.configCatClient.getAllKeysAsync().then(keys => {
      this.allKeys = keys;

      if (this.allKeys.length === 0) {
        this.configCatClientInitializing = false;
        this.configCatClient = null;

        this.apiKeyFormGroup.controls.apiKey.setErrors({ invalid: true });
        return;
      }

      if (this.allKeys.filter(key => key === this.featureFlagKey).length === 0) {
        this.featureFlagKey = this.allKeys[0];
      }

      this.featureFlagKeyFormGroup = this.formBuilder.group({
        featureFlagKey: [this.featureFlagKey, Validators.required]
      });

      this.configCatClientInitializing = false;

      if (this.featureFlagKey) {
        this.initializeFeatureFlagKey();
      }
    });
  }

  initializeFeatureFlagKey() {
    if (!this.featureFlagKeyFormGroup.valid) {
      this.featureFlagKeyInitialized = false;
      return;
    }

    this.featureFlagKey = this.featureFlagKeyFormGroup.controls.featureFlagKey.value;

    this.featureFlagKeyInitialized = true;
    this.handleFeatureFlags();
  }

  initializeApplications() {
    this.handleFeatureFlags();
  }

  handleFeatureFlags() {
    if (!this.featureFlagKeyInitialized) {
      return;
    }

    this.greenCounter = 0;
    this.redCounter = 0;

    this.users.forEach(user => {
      // Simulate multiple client SDKs with some delays
      setTimeout(() => {
        this.configCatClient.getValueAsync(this.featureFlagKey, false, user.userObject).then(value => {
          user.featureEnabled = value;
          if (value) { this.greenCounter++; } else { this.redCounter++; }
        });
      }, Math.floor(Math.random() * 800));
    });
  }

  refresh() {
    this.configCatClient.getAllKeysAsync().then(keys => {
      this.allKeys = keys;
    });
  }

  ngOnDestroy() {
    if (this.paramMapSubscription) {
      this.paramMapSubscription.unsubscribe();
      this.paramMapSubscription = null;
    }
  }
}

export interface UserData {
  emailDomain: string;
  userCount: number;
}

export interface StartupData {
  domains: UserData[];
  countries: string[];
  subscriptionTypes: string[];
}

export interface User {
  userObject: UserObject;
  featureEnabled: boolean;
}

export interface UserObject {
  identifier: string;
  email: string;
  country: string;
  custom: any;
}
