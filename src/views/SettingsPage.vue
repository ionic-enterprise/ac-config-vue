<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="disableEdits" class="error-message" data-testid="logout-message">Please log out first</div>

      <ion-list>
        <ion-list-header> Ionic's OIDC Server Options</ion-list-header>
        <ion-item>
          <ion-label>
            <ion-button expand="full" data-testid="use-azure" :disabled="disableTemplates" @click="useAzure()"
              >Use Azure</ion-button
            >
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <ion-button expand="full" data-testid="use-aws" :disabled="disableTemplates" @click="useAWS()"
              >Use Cognito</ion-button
            >
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <ion-button expand="full" data-testid="use-auth0" :disabled="disableTemplates" @click="useAuth0()"
              >Use Auth0</ion-button
            >
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <ion-button expand="full" data-testid="use-okta" :disabled="disableTemplates" @click="useOkta()"
              >Use Okta</ion-button
            >
          </ion-label>
        </ion-item>
        <ion-list-header> Customize </ion-list-header>
        <ion-item>
          <ion-select
            v-model="provider"
            :compare-with="compareKVPair"
            :disabled="disableEdits"
            label="Auth Config"
            data-testid="provider-select"
          >
            <ion-select-option v-for="p of providers" :value="p" :key="p.key">{{ p.value }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-input
            v-model="clientId"
            :disabled="disableEdits"
            label-placement="floating"
            label="Client ID"
            data-testid="client-id-input"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            v-model="discoveryUrl"
            :disabled="disableEdits"
            label-placement="floating"
            label="Discovery URL"
            data-testid="discovery-url-input"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            v-model="scope"
            :disabled="disableEdits"
            label-placement="floating"
            label="Scope"
            data-testid="scope-input"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            v-model="audience"
            :disabled="disableEdits"
            label-placement="floating"
            label="Audience"
            data-testid="audience-input"
          ></ion-input>
        </ion-item>
        <ion-item v-if="showFlow">
          <ion-select
            v-model="flow"
            :compare-with="compareKVPair"
            :disabled="disableEdits"
            label="Web Auth Flow"
            data-testid="flow-select"
          >
            <ion-select-option v-for="f of flows" :value="f" :key="f.key">{{ f.value }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-label>
            <ion-button
              expand="full"
              data-testid="use-customization"
              :disabled="disableEdits"
              @click="useCustomization()"
            >
              Use Customization</ion-button
            >
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useAuthConfig } from '@/composables/auth-config';
import { useAuthConnect } from '@/composables/auth-connect';
import { Flow, useAuthFlows } from '@/composables/auth-flows';
import { Provider, useAuthProviders } from '@/composables/auth-providers';
import { Capacitor } from '@capacitor/core';
import { ProviderOptions } from '@ionic-enterprise/auth';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewDidEnter,
} from '@ionic/vue';
import { computed, ref } from 'vue';

const disableEdits = ref(false);
const showFlow = ref(false);
const audience = ref('');
const clientId = ref('');
const discoveryUrl = ref('');
const flow = ref<Flow>();
const provider = ref<Provider>();
const scope = ref('');

const disableTemplates = computed(() => disableEdits.value || import.meta.env.VITE_AUTH_URL_SCHEME !== 'msauth');

const { auth0Config, awsConfig, azureConfig, oktaConfig, mobileConfig, webConfig } = useAuthConfig();
const { flows } = useAuthFlows();
const { providers } = useAuthProviders();
const { isAuthenticated, getConfig, getFlow, getProvider, setConfig } = useAuthConnect();

const setIonicProvider = async (opt: ProviderOptions, provider: string, flow: string) => {
  const config: ProviderOptions = {
    ...opt,
    ...(Capacitor.isNativePlatform() ? {} : webConfig),
  };
  await setConfig(
    providers.find((p) => p.key === provider) as Provider,
    config,
    Capacitor.isNativePlatform() ? undefined : flows.find((f) => f.key === flow),
  );
  initCustomizableFields();
};

const compareKVPair = (x: { key: string; value: any }, y: { key: string; value: any }) => {
  return x && y && x.key === y.key;
};

const initialize = async () => {
  disableEdits.value = await isAuthenticated();
  showFlow.value = !Capacitor.isNativePlatform();
  await initCustomizableFields();
};

const initCustomizableFields = async (): Promise<void> => {
  const config = await getConfig();
  clientId.value = config?.clientId || '';
  discoveryUrl.value = config?.discoveryUrl || '';
  scope.value = config?.scope || '';
  audience.value = config?.audience || '';
  const storedFlow = await getFlow();
  flow.value = flows.find((f) => f.key === storedFlow?.key);
  const storedProvider = await getProvider();
  provider.value = providers.find((p) => p.key === storedProvider?.key);
};

const useAuth0 = () => {
  setIonicProvider(auth0Config, 'auth0', 'implicit');
};

const useAWS = async () => {
  setIonicProvider(awsConfig, 'cognito', 'PKCE');
};

const useAzure = async () => {
  setIonicProvider(azureConfig, 'azure', 'implicit');
};

const useOkta = () => {
  setIonicProvider(oktaConfig, 'okta', 'PKCE');
};

const useCustomization = () => {
  const config: ProviderOptions = {
    clientId: clientId.value,
    discoveryUrl: discoveryUrl.value,
    scope: scope.value,
    audience: audience.value,
    ...(Capacitor.isNativePlatform() ? mobileConfig : webConfig),
  };
  return setConfig(provider.value as Provider, config, flow.value);
};

onIonViewDidEnter(() => initialize());
initialize();
</script>
