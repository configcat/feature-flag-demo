import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import * as configcat from 'configcat-js';
import { IConfigCatClient } from 'configcat-common/lib/ConfigCatClient';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { uniqueNamesGenerator, names } from 'unique-names-generator';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
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

  countries = ['US', 'UK', 'Canada'];
  subscriptionTypes = ['Free', 'Pro', 'Enterprise'];
  emailDomains = [
    ['@mycompany.com', 10,],
    ['@example.com', 20],
    ['@sensitive.com', 10]
  ]
  emails = [];
  users = [];

  getRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  constructor(
    route: ActivatedRoute,
    private formBuilder: FormBuilder
  ) {

    this.emailDomains.forEach(domain => {
      for (let index = 0; index < domain[1]; index++) {
        const randomName: string = uniqueNamesGenerator({
          dictionaries: [names],
          length: 1
        });
        randomName.replace(/\s/g, "");
        this.emails.push(`${randomName.toLowerCase()}\n${domain[0]}`);
      }

    })

    this.users = this.emails.map(email => {
      return {
        userObject: {
          identifier: email,
          email,
          country: this.getRandom(this.countries),
          custom: { subscriptionType: this.getRandom(this.subscriptionTypes) }
        }, featureEnabled: false
      };
    });

    this.paramMapSubscription = route.queryParamMap.subscribe(params => {

      this.apiKey = params.get('apiKey');
      this.baseUrl = params.get('baseUrl');
      this.featureFlagKey = params.get('featureFlagKey');

      if (!this.featureFlagKey) {
        this.featureFlagKey = 'isAwesomeFeatureEnabled';
      }

      this.apiKeyFormGroup = this.formBuilder.group({
        apiKey: [this.apiKey, Validators.required]
      });

      this.featureFlagKeyFormGroup = this.formBuilder.group({
        featureFlagKey: ['', Validators.required]
      });

      this.loading = false;

      if (this.apiKey) {
        this.initializeConfigCatClient();
      }
    });
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
        this.initializeFeatureFlagKey(null);
      }
    });
  }

  initializeFeatureFlagKey(stepper: MatStepper) {
    if (!this.featureFlagKeyFormGroup.valid) {
      return;
    }

    this.featureFlagKey = this.featureFlagKeyFormGroup.controls.featureFlagKey.value;

    this.featureFlagKeyInitialized = true;
    this.handleFeatureFlags();
    if (stepper) {
      stepper.selected.completed = true;
      stepper.next();
    }
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
        this.configCatClient.getValue(this.featureFlagKey, false, value => {
          user.featureEnabled = value;
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
