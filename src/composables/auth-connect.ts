import { Preferences } from '@capacitor/preferences';
import {
  Auth0Provider,
  AuthConnect,
  AuthConnectConfig,
  AuthResult,
  AzureProvider,
  CognitoProvider,
  OktaProvider,
  OneLoginProvider,
  ProviderOptions,
} from '@ionic-enterprise/auth';
import { isPlatform } from '@ionic/vue';
import { useAuthConfig } from './auth-config';
import { Flow, useAuthFlows } from './auth-flows';
import { Provider, useAuthProviders } from './auth-providers';

const authProviderKey = 'auth-provider';
const authProviderOptionsKey = 'auth-provider-options';
const authFlowKey = 'auth-flow';
const authResultKey = 'auth-result';

let currentOptions: ProviderOptions | undefined;
let currentFlow: Flow | undefined;
let currentProvider: Provider | undefined;

let authResult: AuthResult | undefined;

let provider: Auth0Provider | AzureProvider | CognitoProvider | OktaProvider | OneLoginProvider;

const { providers } = useAuthProviders();
const { flows } = useAuthFlows();

const createProvider = async (): Promise<void> => {
  const authProvider = (await getProvider()) || providers.find((p) => p.key === 'cognito');
  switch (authProvider?.key) {
    case 'auth0':
      provider = new Auth0Provider();
      break;

    case 'azure':
      provider = new AzureProvider();
      break;

    case 'cognito':
      provider = new CognitoProvider();
      break;

    case 'okta':
      provider = new OktaProvider();
      break;

    case 'onelogin':
      provider = new OneLoginProvider();
      break;

    default:
      break;
  }
};

const initializeAuthConnect = async (): Promise<void> => {
  const opt = await getConfig();
  if (opt) {
    await createProvider();
    await setupAuthConnect();
    await initializeAuthResult();
  } else {
    await setDefaultConfig();
  }
};

const initializeAuthResult = async (): Promise<void> => {
  const { value } = await Preferences.get({ key: authResultKey });
  authResult = value ? JSON.parse(value) : undefined;
};

const setDefaultConfig = async (): Promise<void> => {
  if (isPlatform('hybrid')) {
    await setDefaultConfigMobile();
  } else {
    await setDefaultConfigWeb();
  }
};

const setDefaultConfigMobile = async (): Promise<void> => {
  const { awsConfig, mobileConfig } = useAuthConfig();
  const provider = providers.find((p) => p.key === 'cognito');
  if (provider) {
    await setConfig(provider, { ...awsConfig, ...mobileConfig });
  }
};

const setDefaultConfigWeb = async (): Promise<void> => {
  const { awsConfig, webConfig } = useAuthConfig();
  const provider = providers.find((p) => p.key === 'cognito');
  const flow = flows.find((f) => f.key === 'PKCE');
  if (provider && flow) {
    await setConfig(
      provider,
      {
        ...awsConfig,
        ...webConfig,
      },
      flow,
    );
  }
};

const setupAuthConnect = async (): Promise<void> => {
  const flow = await getFlow();
  const cfg: AuthConnectConfig = {
    logLevel: 'DEBUG',
    platform: isPlatform('hybrid') ? 'capacitor' : 'web',
    ios: {
      webView: 'private',
    },
    web: {
      uiMode: 'popup',
      authFlow: flow ? flow.key : 'implicit',
    },
  };

  await AuthConnect.setup(cfg);
};

// This is really just for resetting between tests
const clearCache = () => {
  currentOptions = undefined;
  currentFlow = undefined;
  currentProvider = undefined;
  authResult = undefined;
};

const canRefresh = async (): Promise<boolean> =>
  !!authResult && (await AuthConnect.isRefreshTokenAvailable(authResult));

const getAccessToken = (): string | undefined => authResult?.accessToken;

const getConfig = async (): Promise<ProviderOptions | undefined> => {
  if (!currentOptions) {
    const { value } = await Preferences.get({
      key: authProviderOptionsKey,
    });
    currentOptions = value ? JSON.parse(value) : undefined;
  }
  return currentOptions;
};

const getFlow = async (): Promise<Flow | undefined> => {
  if (!currentFlow) {
    const { value } = await Preferences.get({ key: authFlowKey });
    currentFlow = value ? JSON.parse(value) : undefined;
  }
  return currentFlow;
};

const getProvider = async (): Promise<Provider | undefined> => {
  if (!currentProvider) {
    const { value } = await Preferences.get({ key: authProviderKey });
    currentProvider = value ? JSON.parse(value) : undefined;
  }
  return currentProvider;
};

const isAccessTokenExpired = async (): Promise<boolean> =>
  !!authResult && (await AuthConnect.isAccessTokenExpired(authResult));

const isAuthenticated = async (): Promise<boolean> =>
  !!authResult && (await AuthConnect.isAccessTokenAvailable(authResult));

const login = async (): Promise<void> => {
  if (currentOptions && !authResult) {
    authResult = await AuthConnect.login(provider, currentOptions);
    await Preferences.set({
      key: authResultKey,
      value: JSON.stringify(authResult),
    });
  }
};

const logout = async (): Promise<void> => {
  if (authResult) {
    await AuthConnect.logout(provider, authResult);
    authResult = undefined;
    await Preferences.remove({ key: authResultKey });
  }
};

const refresh = async (): Promise<void> => {
  if (authResult) {
    authResult = await AuthConnect.refreshSession(provider, authResult);
    await Preferences.set({
      key: authResultKey,
      value: JSON.stringify(authResult),
    });
  }
};

const setConfig = async (provider: Provider, options: ProviderOptions, flow?: Flow): Promise<void> => {
  await Promise.all([
    Preferences.set({
      key: authProviderKey,
      value: JSON.stringify(provider),
    }),
    Preferences.set({
      key: authProviderOptionsKey,
      value: JSON.stringify(options),
    }),
    flow
      ? Preferences.set({
          key: authFlowKey,
          value: JSON.stringify(flow),
        })
      : Preferences.remove({ key: authFlowKey }),
  ]);
  currentProvider = provider;
  currentOptions = options;
  currentFlow = flow;
  await setupAuthConnect();
  await createProvider();
};

export const useAuthConnect = () => ({
  clearCache,
  canRefresh,
  getAccessToken,
  getConfig,
  getFlow,
  getProvider,
  initializeAuthConnect,
  isAccessTokenExpired,
  isAuthenticated,
  login,
  logout,
  refresh,
  setConfig,
});
