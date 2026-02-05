import { NgClass } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, DOCUMENT, effect, inject, input, OnInit, Renderer2, signal, WritableSignal } from "@angular/core";
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatOption } from "@angular/material/core";
import { MatError, MatFormField, MatLabel } from "@angular/material/form-field";
import { MatInput } from "@angular/material/input";
import { MatSelect } from "@angular/material/select";
import { getClient, type IConfigCatClient, PollingMode } from "@configcat/sdk";
import { environment } from "src/environments/environment";
import { names, uniqueNamesGenerator } from "unique-names-generator";
import { v4 as uuidv4 } from "uuid";

@Component({
  selector: "app-main",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatButton,
    MatSelect,
    MatOption,
    NgClass,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly renderer = inject(Renderer2);
  private readonly document = inject<Document>(DOCUMENT);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly sdkKey = input<string>();
  readonly baseUrl = input<string>();
  readonly featureFlagKey = input<string>();
  readonly featureFlagUrl = input<string>();
  readonly environmentName = input<string>();
  readonly configName = input<string>();
  readonly hideControls = input<string>();

  readonly loading = signal(true);
  readonly showControls = computed(() => !this.featureFlagKey() || this.hideControls() !== "true");

  readonly sdkKeyEffect = effect(() => {
    if (this.sdkKey()) {
      this.sdkKeyFormGroup.patchValue({ sdkKey: this.sdkKey() });
    } else {
      this.sdkKeyFormGroup.reset();
    }
  });

  readonly featureFlagKeyEffect = effect(() => {
    this.featureFlagKeyFormGroup.patchValue({ featureFlagKey: this.featureFlagKey() ?? "" });
  });

  private configCatClient: IConfigCatClient | null = null;
  readonly allKeys = signal<string[]>([]);
  readonly featureFlagKeyInitialized = signal(false);
  readonly sdkKeyFormGroup = this.formBuilder.group({ sdkKey: ["", Validators.required] });
  readonly featureFlagKeyFormGroup = this.formBuilder.group({ featureFlagKey: ["" as string | null, Validators.required] });
  private readonly startupData: StartupData = {
    domains: [
      { emailDomain: "@example.com", userCount: 12 },
      { emailDomain: "@friends.com", userCount: 12 },
      { emailDomain: "@mycompany.com", userCount: 12 },
    ],
    countries: ["Australia", "Brazil", "EU", "USA"],
    subscriptionTypes: ["Free", "Pro", "Enterprise"],
    tenants: ["A", "B", "C"],
  };
  private emails: string[] = [];
  readonly users = signal<User[]>([]);

  getRandom(array: string[]) {
    // eslint-disable-next-line sonarjs/pseudo-random
    return array[Math.floor(Math.random() * array.length)];
  }

  constructor() {
    this.initGoogleTagManager(environment.googleTagManagerId);
  }

  ngOnInit(): void {

    this.sdkKeyFormGroup.valueChanges.subscribe(v => {
      if (v.sdkKey) {
        this.initializeConfigCatClient();
      }
    });

    this.featureFlagKeyFormGroup.valueChanges.subscribe(v => {
      if (v.featureFlagKey) {
        this.handleFeatureFlags();
      }
    });

    this.generateUsers();
    this.loading.set(false);
  }

  initGoogleTagManager(googleTagManagerId: string) {
    if (!googleTagManagerId) {
      return;
    }

    // injecting Google Tag Manager script
    const script = this.renderer.createElement("script") as HTMLScriptElement;
    script.text = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${googleTagManagerId}');
    `;
    this.renderer.appendChild(this.document.head, script);

    const noscript = this.renderer.createElement("noscript") as HTMLScriptElement;

    const iframe = this.renderer.createElement("iframe") as HTMLIFrameElement;
    iframe.src = "https://www.googletagmanager.com/ns.html?id=" + googleTagManagerId;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    noscript.appendChild(iframe);
    this.renderer.appendChild(this.document.body, noscript);
  }

  generateUsers() {
    this.emails = [];
    this.startupData.domains.forEach(domain => {
      this.generateAndAddEmailAddresses(domain.emailDomain, domain.userCount);
    });

    this.users.set(this.emails.map(email => {
      return {
        userObject: {
          identifier: uuidv4(),
          email,
          country: this.getRandom(this.startupData.countries),
          custom: {
            SubscriptionType: this.getRandom(this.startupData.subscriptionTypes),
            Tenant: this.getRandom(this.startupData.tenants),
          },
        },
        featureEnabled: signal(false),
      };
    }));
    if (this.sdkKeyFormGroup.value.sdkKey) {
      this.handleFeatureFlags();
    }
  }

  generateAndAddEmailAddresses(domain: string, count: number) {
    for (let index = 0; index < count; index++) {
      let randomName: string = uniqueNamesGenerator({
        dictionaries: [names],
        length: 1,
      });
      randomName = randomName.replace(/\s/g, "");
      this.emails.push(`${randomName.toLowerCase()}${domain}`);
    }
  }

  initializeConfigCatClient() {
    if (!this.sdkKeyFormGroup.valid) {
      return;
    }

    if (this.configCatClient) {
      this.configCatClient.dispose();
    }
    this.configCatClient = getClient(this.sdkKeyFormGroup.controls.sdkKey.value, PollingMode.AutoPoll, {
      pollIntervalSeconds: 1,
      setupHooks: hooks =>
        hooks.on("configChanged", () => {
          this.refresh();
          this.handleFeatureFlags();
        }),
      baseUrl: this.baseUrl(),
    });

    this.configCatClient
      .getAllKeysAsync()
      .then(keys => {
        this.allKeys.set(keys);

        if (this.allKeys().length === 0) {
          this.configCatClient = null;

          this.sdkKeyFormGroup.controls.sdkKey.setErrors({ invalid: true });
          return;
        }

        let featureFlagKey = this.featureFlagKey();
        if (this.allKeys().filter(key => key === this.featureFlagKey()).length === 0) {
          featureFlagKey = this.allKeys()[0];
        }

        this.featureFlagKeyFormGroup.patchValue({ featureFlagKey });

        if (this.featureFlagKeyFormGroup.controls.featureFlagKey.value) {
          this.initializeFeatureFlagKey();
        }
      })
      .catch((error: unknown) => {
        console.log(error);
      });
  }

  initializeFeatureFlagKey() {
    if (!this.featureFlagKeyFormGroup.valid) {
      this.featureFlagKeyInitialized.set(false);
      return;
    }

    this.featureFlagKeyInitialized.set(true);
    this.handleFeatureFlags();
  }

  initializeApplications() {
    this.handleFeatureFlags();
  }

  handleFeatureFlags() {
    if (!this.featureFlagKeyInitialized()) {
      return;
    }

    this.users().forEach(user => {
      // Simulate multiple client SDKs with some delays
      setTimeout(
        () => {
          this.configCatClient
            ?.getValueAsync(this.featureFlagKeyFormGroup.value.featureFlagKey!, false, user.userObject)
            .then(value => {
              user.featureEnabled.set(value);
            })
            .catch(() => {
              // Intentionally empty
            });
        },
        // eslint-disable-next-line sonarjs/pseudo-random
        Math.floor(Math.random() * 800)
      );
    });
  }

  refresh() {
    this.configCatClient
      ?.getAllKeysAsync()
      .then(keys => {
        this.allKeys.set(keys);
      })
      .catch(() => {
        // Intentionally empty
      });
  }
}

export interface UserData {
  readonly emailDomain: string;
  readonly userCount: number;
}

export interface StartupData {
  readonly domains: UserData[];
  readonly countries: string[];
  readonly subscriptionTypes: string[];
  readonly tenants: string[];
}

export interface User {
  readonly userObject: UserObject;
  readonly featureEnabled: WritableSignal<boolean>;
}

export interface UserObject {
  readonly identifier: string;
  readonly email: string;
  readonly country: string;
  readonly custom: Record<string, string>;
}
