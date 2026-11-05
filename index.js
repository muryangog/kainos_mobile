import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent appelle AppRegistry.registerComponent('main', () => App);
// Cela garantit qu'Expo enregistre correctement le point d'entrée 'main'.
registerRootComponent(App);
