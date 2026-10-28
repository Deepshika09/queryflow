
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App.tsx';
import './index.css';

const appUrl = 'https://d2o670fn9dzsau.cloudfront.net/';

const cognitoAuthConfig = {
  authority:
    'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_JYN8tXOMG',
  client_id: '612puge515r68q57a0hkmqduvp',
  redirect_uri: appUrl,
  post_logout_redirect_uri: appUrl,
  response_type: 'code',
  scope: 'openid email profile',
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

createRoot(document.getElementById('root')!).render(
  <AuthProvider {...cognitoAuthConfig}>
    <App />
  </AuthProvider>,
);
