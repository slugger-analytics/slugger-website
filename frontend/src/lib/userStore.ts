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

export const $user = persistentAtom<UserType>(
  "user",
  emptyUser,
  {
    encode: (value) => JSON.stringify(value),
    decode: (value) => {
      if (!value) return emptyUser;

      try {
        return JSON.parse(value) as UserType;
      } catch (error) {
        console.warn("Failed to decode user persistent atom", error);
        return emptyUser;
      }
    },
  },
);

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
