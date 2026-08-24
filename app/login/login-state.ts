export type LoginState = {
  at?: number;
  cooldownSeconds?: number;
  email?: string;
  error?: string;
  step: 'email' | 'code';
};

export const latestLoginState = (emailState: LoginState, codeState: LoginState): LoginState =>
  (codeState.at ?? 0) >= (emailState.at ?? 0) ? codeState : emailState;
