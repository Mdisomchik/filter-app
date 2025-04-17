import React, { useEffect, useState } from 'react';
import { View, Button, Text, ScrollView, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import {
  useAuthRequest,
  makeRedirectUri,
  exchangeCodeAsync,
  refreshAsync,
  ResponseType,
} from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = '106794135380-9j6ahfrekahtdoom51rlcq44ltd7empk.apps.googleusercontent.com';
const REDIRECT_URI = 'https://auth.expo.io/@madisomchik/filter-app';
const ACCESS_TOKEN_KEY = 'googleAccessToken';
const REFRESH_TOKEN_KEY = 'googleRefreshToken';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function LoginScreen() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [emails, setEmails] = useState<any[]>([]);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      responseType: ResponseType.Code,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'email'],
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    const handleAuth = async () => {
      if (response?.type === 'success' && response.params.code) {
        try {
          const tokenResult = await exchangeCodeAsync(
            {
              clientId: CLIENT_ID,
              code: response.params.code,
              redirectUri: REDIRECT_URI,
              extraParams: {
                code_verifier: request?.codeVerifier || '',
              },
            },
            discovery
          );

          const { accessToken, refreshToken } = tokenResult;
          setAccessToken(accessToken);
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
          if (refreshToken) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
          }
        } catch (err) {
          console.error('Token exchange failed', err);
          Alert.alert('Auth error', 'Failed to get access token');
        }
      }
    };

    handleAuth();
  }, [response]);

  const fetchInbox = async () => {
    if (!accessToken) return;

    try {
      const messageList = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const listData = await messageList.json();

      const messages = await Promise.all(
        (listData.messages || []).map(async (msg: any) => {
          const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=subject`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          const msgData = await res.json();
          const subjectHeader = (msgData.payload.headers || []).find(
            (h: any) => h.name === 'Subject'
          );
          const subject = subjectHeader?.value || '(No Subject)';
          const snippet = msgData.snippet || '';
          return { id: msg.id, subject, snippet };
        })
      );

      setEmails(messages);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch Gmail messages');
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setEmails([]);
    Alert.alert('Logged Out');
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
      {!accessToken ? (
        <Button title="Login with Google" onPress={() => promptAsync()} disabled={!request} />
      ) : (
        <>
          <Button title="Fetch Inbox" onPress={fetchInbox} />
          <View style={{ marginTop: 10 }}>
            <Button title="Logout" onPress={logout} color="red" />
          </View>
          {emails.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontWeight: 'bold' }}>Latest Emails:</Text>
              {emails.map((email) => (
                <View key={email.id} style={{ marginVertical: 4 }}>
                  <Text>Subject: {email.subject}</Text>
                  <Text>Snippet: {email.snippet}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
