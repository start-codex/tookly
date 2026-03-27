import type { LayoutLoad } from './$types';

export const load: LayoutLoad = () => {
	return {
		breadcrumb: [{ labelKey: 'settings_nav' }]
	};
};
