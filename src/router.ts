import { pageRoutes } from 'virtual:file-routes';
import { createRouter, intentPreload } from '@solidjs/router';
import { fileRoutes } from '@solidjs/router/fs';

export const Router = createRouter({
  routes: fileRoutes(pageRoutes),
  base: import.meta.env.BASE_URL,
  preloadLinks: intentPreload(),
});

export const { paths } = Router;
