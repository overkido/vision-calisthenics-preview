/** Auth boundary for a future trusted backend (for example, Supabase or Firebase).
 * Never persist passwords or provider tokens in AsyncStorage or in the app bundle.
 */
export type AuthProvider = 'email' | 'google' | 'apple';
export type AuthResult = { status: 'pending-configuration'; message: string };

export async function beginSignIn(provider: AuthProvider): Promise<AuthResult> {
  const label = provider === 'email' ? 'Cadastro por e-mail' : `Login com ${provider === 'google' ? 'Google' : 'Apple'}`;
  return {
    status: 'pending-configuration',
    message: `${label} ainda precisa da configuração segura do provedor e do backend. Nenhuma conta foi criada.`
  };
}
