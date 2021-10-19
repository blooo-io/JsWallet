import { Page } from '../types';

// const viewportSize = { width: 1920, height: 1080 };

export async function setupPage(page: Page, params?: {
  viewport?: {
    width: number,
    height: number,
  },
  defaultTimeout?: number,
  defaultNavigationTimeout?: number,
}) {
  page.setDefaultNavigationTimeout(params?.defaultNavigationTimeout || 30000);
  page.setDefaultTimeout(params?.defaultTimeout || 7000);
  // page.setViewportSize({ width: params?.viewport?.width || windowSize.width, height: params?.viewport?.height || windowSize.height });
}
