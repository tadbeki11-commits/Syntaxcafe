import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { settingsAdapter } from '@/infrastructure/adapters/settings.adapter';
import { SettingsFacade } from '@/application/settings/settings.facade';

export const registerSettingsModule = (container: Container): void => {
  container.registerSingleton(
    TOKENS.settingsFacade,
    new SettingsFacade(settingsAdapter),
  );
};
