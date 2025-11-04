import { atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import { UserType } from "@/data/types";

const emptyUser: UserType = {
  id: "",
  first: "",
  last: "",
  email: "",
  role: "",
  teamId: "",
  is_admin: false,
};

// Custom encoder/decoder to handle boolean values
const booleanEncoder = {
  encode: (value: any) => {
    if (typeof value === 'boolean') {
      return String(value);
    }
    return value;
  },
  decode: (value: any) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }
};

export const $user = persistentMap("user:", emptyUser, booleanEncoder);

export const $otpCode = atom<string>("");
export const $passwordResetEmail = atom<string>("");

export function clearUserStore() {
  $user.set(emptyUser);
  $otpCode.set("");
  $passwordResetEmail.set("");
}

export function setUser(user: UserType) {
  $user.set(user);
}

export function getUser(): UserType {
  return $user.get();
}

type UpdateUserType = {
  first?: string;
  last?: string;
  teamId?: string;
};
export function updateStoreUser({ first, last, teamId }: UpdateUserType) {
  const user = $user.get();

  if (!user) return;

  $user.set({
    ...user,
    ...(first !== undefined && { first }),
    ...(last !== undefined && { last }),
    ...(teamId !== undefined && { teamId }),
  });
}

export function setOtpCode(otp: string) {
  $otpCode.set(otp);
}

export function setPasswordResetEmail(email: string) {
  $passwordResetEmail.set(email);
}
