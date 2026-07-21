import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Catalogue: undefined;
  Basket: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Product: { slug: string };
  Login: undefined;
  Register: undefined;
  Checkout: undefined;
  Profile: undefined;
  Orders: undefined;
  Order: { orderNumber: string };
};
