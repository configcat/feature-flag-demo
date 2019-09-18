import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import * as configcat from 'configcat-js';
import { IConfigCatClient } from 'configcat-common/lib/ConfigCatClient';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {
  paramMapSubscription: Subscription;
  loading = true;

  apiKey: string;
  configCatClient: IConfigCatClient;
  allKeys: string[] = [];

  configCatClientInitializing = false;
  configCatClientInitialized = false;

  featureFlagKey: string;
  featureFlagKeyInitialized = false;

  apiKeyFormGroup: FormGroup;
  featureFlagKeyFormGroup: FormGroup;

  countries = ['US', 'UK', 'HU'];
  subscriptionTypes = ['Free', 'Pro'];

  emails = [
    '0@dog.com',
    '1@dog.com',
    '2@dog.com',
    '3@dog.com',
    '4@dog.com',
    '5@dog.com',
    '6@dog.com',
    '7@dog.com',
    '8@dog.com',
    '9@dog.com',

    '0@danger.com',
    '1@danger.com',
    '2@danger.com',
    '3@danger.com',
    '4@danger.com',
    '5@danger.com',
    '6@danger.com',
    '7@danger.com',
    '8@danger.com',
    '9@danger.com',

    '0@ex.com',
    '1@ex.com',
    '2@ex.com',
    '3@ex.com',
    '4@ex.com',
    '5@ex.com',
    '6@ex.com',
    '7@ex.com',
    '8@ex.com',
    '9@ex.com',
    '10@ex.com',
    '11@ex.com',
    '12@ex.com',
    '13@ex.com',
    '14@ex.com',
    '15@ex.com',
    '16@ex.com',
    '17@ex.com',
    '18@ex.com',
    '19@ex.com',
    '20@ex.com',
    '21@ex.com',
    '22@ex.com',
    '23@ex.com',
    '24@ex.com',
    '25@ex.com',
    '26@ex.com',
    '27@ex.com',
    '28@ex.com',
    '29@ex.com',
    '30@ex.com',
    '31@ex.com',
    '32@ex.com',
    '33@ex.com',
    '34@ex.com',
    '35@ex.com',
    '36@ex.com',
    '37@ex.com',
    '38@ex.com',
    '39@ex.com',
    '40@ex.com',
    '41@ex.com',
    '42@ex.com',
    '43@ex.com',
    '44@ex.com',
    '45@ex.com',
    '46@ex.com',
    '47@ex.com',
    '48@ex.com',
    '49@ex.com',
    '50@ex.com',
    '51@ex.com',
    '52@ex.com',
    '53@ex.com',
    '54@ex.com',
    '55@ex.com',
    '56@ex.com',
    '57@ex.com',
    '58@ex.com',
    '59@ex.com',
    '60@ex.com',
    '61@ex.com',
    '62@ex.com',
    '63@ex.com',
    '64@ex.com',
    '65@ex.com',
    '66@ex.com',
    '67@ex.com',
    '68@ex.com',
    '69@ex.com',
    '70@ex.com',
    '71@ex.com',
    '72@ex.com',
    '73@ex.com',
    '74@ex.com',
    '75@ex.com',
    '76@ex.com',
    '77@ex.com',
    '78@ex.com',
    '79@ex.com',
    '80@ex.com',
    '81@ex.com',
    '82@ex.com',
    '83@ex.com',
    '84@ex.com',
    '85@ex.com',
    '86@ex.com',
    '87@ex.com',
    '88@ex.com',
    '89@ex.com',
    '90@ex.com',
    '91@ex.com',
    '92@ex.com',
    '93@ex.com',
    '94@ex.com',
    '95@ex.com',
    '96@ex.com',
    '97@ex.com',
    '98@ex.com',
    '99@ex.com',
  ];
  users = [];

  getRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder
  ) {

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

    this.paramMapSubscription = route.paramMap.subscribe(paramMap => {

      this.apiKey = paramMap.get('apiKey');
      this.featureFlagKey = paramMap.get('featureFlagKey');

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
    });
  }

  initializeConfigCatClient(stepper: MatStepper) {
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
      }
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

      this.configCatClientInitialized = true;
      this.configCatClientInitializing = false;
      stepper.selected.completed = true;
      stepper.next();
    });
  }

  initializeFeatureFlagKey(stepper: MatStepper) {
    if (!this.featureFlagKeyFormGroup.valid) {
      return;
    }

    this.featureFlagKey = this.featureFlagKeyFormGroup.controls.featureFlagKey.value;

    this.featureFlagKeyInitialized = true;
    this.handleFeatureFlags();
    stepper.selected.completed = true;
    stepper.next();
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
