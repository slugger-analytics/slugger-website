import { CategoryType, WidgetType } from "@/data/types";
import { $user, updateStoreUser } from "@/lib/store";

import { useAuth } from "../contexts/AuthContext";
import { addFavorite, removeFavorite } from "@/api/user";
import { useStore } from "@nanostores/react";
import { editUser } from "../../api/user";

function useMutationUser() {
  const user = useStore($user);
  const { setLoading } = useAuth();

  const updateUser = async ({ first, last }) => {
    try {
      await editUser(user.id, { first, last });
      updateStoreUser({
        first,
        last,
      });
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  return {
    updateUser,
  };
}

export default useMutationUser;
