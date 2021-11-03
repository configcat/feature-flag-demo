import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import * as configcat from 'configcat-js';
import { IConfigCatClient } from 'configcat-common/lib/ConfigCatClient';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  apiKeyFormGroup: FormGroup;
  featureFlagKeyFormGroup: FormGroup;
  userCountFormGroup: FormGroup;
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
    private formBuilder: FormBuilder
  ) {

  }
  ngOnInit(): void {
    this.paramMapSubscription = this.route.queryParamMap.subscribe(params => {

      this.apiKey = params.get('sdkKey');
      this.baseUrl = params.get('baseUrl');
      this.featureFlagKey = params.get('featureFlagKey');

      if (!this.featureFlagKey) { this.featureFlagKey = 'isAwesomeFeatureEnabled'; }
      this.apiKeyFormGroup = this.formBuilder.group({ apiKey: [this.apiKey, Validators.required] });
      this.featureFlagKeyFormGroup = this.formBuilder.group({ featureFlagKey: ['', Validators.required] });
      this.userCountFormGroup = this.formBuilder.group({ userCount: [20, Validators.required] });

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
    if (this.apiKey) { this.initializeConfigCatClient(); }
  }

  generateAndAddEmailAddresses(domain: string, count: number) {
    for (let index = 0; index < count; index++) {
      const randomName: string = uniqueNamesGenerator({
        dictionaries: [names],
        length: 1
      });
      randomName.replace(/\s/g, "");
      this.emails.push(`${randomName.toLowerCase()}\n${domain}`);
    }
  }

  initializeConfigCatClient() {
    if (!this.apiKeyFormGroup.valid) {
      return;
    }

    this.apiKey = this.apiKeyFormGroup.controls.apiKey.value;

    this.configCatClientInitializing = true;
    this.configCatClient = configcat.createClientWithAutoPoll(this.apiKey, {
      pollIntervalSeconds: 1,
      configChanged: () => {
        this.refresh();
        this.handleFeatureFlags();
      },
      baseUrl: this.baseUrl
    });

    this.configCatClient.getAllKeys(keys => {
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
        this.configCatClient.getValue(this.featureFlagKey, false, value => {
          user.featureEnabled = value;
          if (value) { this.greenCounter++; } else { this.redCounter++; }
        }, user.userObject);
      }, Math.floor(Math.random() * 800));
    });
  }

  refresh() {
    this.configCatClient.getAllKeys(keys => {
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
