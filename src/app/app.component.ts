import { Component, Renderer2, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from 'src/environments/environment';
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
  showControls = true;

  apiKey: string;
  configCatClient: IConfigCatClient;
  allKeys: string[] = [];
  configCatClientInitializing = false;
  featureFlagKey: string;
  featureFlagKeyInitialized = false;
  baseUrl: string;
  apiKeyFormGroup = this.formBuilder.group({ apiKey: ['', Validators.required] });
  featureFlagKeyFormGroup = this.formBuilder.group({ featureFlagKey: ['', Validators.required] });
  startupData: StartupData = {
    domains: [
      { emailDomain: '@example.com', userCount: 12 },
      { emailDomain: '@friends.com', userCount: 12 },
      { emailDomain: '@mycompany.com', userCount: 12 },
    ],
    countries: ['Australia', 'Brazil', 'EU', 'USA'],
    subscriptionTypes: ['Free', 'Pro', 'Enterprise'],
    tenants: ['A', 'B', 'C']
  };
  emails: string[] = [];
  users: User[] = [];
  configName = '';
  environmentName = '';
  featureFlagUrl = '';

  getRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private route: ActivatedRoute,
    private formBuilder: NonNullableFormBuilder
  ) {
    this.initGoogleTagManager(environment.googleTagManagerId);
  }
  ngOnInit(): void {
    this.paramMapSubscription = this.route.queryParamMap.subscribe(params => {

      this.apiKey = params.get('sdkKey');
      this.baseUrl = params.get('baseUrl');
      this.featureFlagKey = params.get('featureFlagKey');
      this.featureFlagUrl = params.get('featureFlagUrl');
      this.environmentName = params.get('environmentName');
      this.configName = params.get('configName');

      if (!this.featureFlagKey) { this.featureFlagKey = ''; }
      this.apiKeyFormGroup.patchValue({ apiKey: this.apiKey });
      this.featureFlagKeyFormGroup.patchValue({ featureFlagKey: this.featureFlagKey });

      if (this.apiKey) {
        // at this point, we have everything to try to init the client
        this.initializeConfigCatClient();
        if (this.featureFlagKey && params.get('hideControls') === "true") {
          // it's very likely the app is configured through the url, and the user wants to use it that way
          this.showControls = false;
        }
      }

      this.loading = false;

      this.generateUsers();
    });
  }

  initGoogleTagManager(googleTagManagerId: string) {
    if (!googleTagManagerId) {
      return;
    }

    // injecting Google Tag Manager script
    const script = this.renderer.createElement('script');
    script.text = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${googleTagManagerId}');
    `;
    this.renderer.appendChild(this.document.head, script);

    const noscript = this.renderer.createElement('noscript');

    const iframe = this.renderer.createElement('iframe');
    iframe.src =
      'https://www.googletagmanager.com/ns.html?id=' + googleTagManagerId;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    this.renderer.appendChild(this.document.body, noscript);
  }

  generateUsers() {
    this.users = [];
    this.emails = [];
    this.startupData.domains.forEach(domain => {
      this.generateAndAddEmailAddresses(domain.emailDomain, domain.userCount);
    });

    this.users = this.emails.map(email => {
      return {
        userObject: {
          identifier: uuidv4(),
          email,
          country: this.getRandom(this.startupData.countries),
          custom: {
            SubscriptionType: this.getRandom(this.startupData.subscriptionTypes),
            Tenant: this.getRandom(this.startupData.tenants)
          }
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

    this.users.forEach(user => {
      // Simulate multiple client SDKs with some delays
      setTimeout(() => {
        this.configCatClient.getValueAsync(this.featureFlagKey, false, user.userObject).then(value => {
          user.featureEnabled = value;
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
  tenants: string[];
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
