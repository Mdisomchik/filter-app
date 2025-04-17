import React, { useEffect, useState } from 'react';
import { Button, View, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  useAuthRequest,
  makeRedirectUri,
  ResponseType,
} from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = '106794135380-9j6ahfrekahtdoom51rlcq44ltd7empk.apps.googleusercontent.com';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function LoginScreen() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const redirectUri = makeRedirectUri();

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Token,
      clientId: CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'email'],
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params;
      setAccessToken(access_token);
    }
  }, [response]);

  const fetchInbox = async () => {
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const data = await res.json();
    console.log('Inbox:', data);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      {!accessToken ? (
        <Button title="Login with Google" disabled={!request} onPress={() => promptAsync()} />
      ) : (
        <>
          <Text>Logged in successfully!</Text>
          <Button title="Fetch Gmail Inbox" onPress={fetchInbox} />
        </>
      )}
    </View>
  );
}
