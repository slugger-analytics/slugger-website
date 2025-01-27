interface APIResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

// The shape of the data for a widget
export interface WidgetType {
  id: number;
  name: string;
  description?: string;
  visibility?: string;
  status?: string;
  createdAt?: string;
  redirectLink?: string;
  imageUrl?: string;
  categoryIds?: number[];
  developerIds?: number[];
}

export interface RegisterWidgetDataType {
  widgetName: string; // The name of the widget
  description: string; // A description of the widget
  visibility: string; // Visibility status ('Public', 'Private', etc.)
}

export type UserType = {
  id: string;
  first: string;
  last: string;
  email: string;
  role: string;
  team_id?: string;
};

export type UserAPIResType = {
  authData: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    cognitoUserId: string;
  };
  user: UserType;
};

export interface PendingWidget {
  request_id: string;
  widget_name: string;
  description: string;
  visibility: string;
  status: string;
  created_at: string;
  approved_at: string;
  user_id: string;
}

export type PendingWidgetsAPIRes = APIResponse<PendingWidget[]>;

export interface AuthDataType {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export interface LoginType {
  user: UserType;
  authData: AuthDataType;
}

export type LoginAPIRes = APIResponse<LoginType>;

export type FavoritesAPIRes = APIResponse<number[]>;