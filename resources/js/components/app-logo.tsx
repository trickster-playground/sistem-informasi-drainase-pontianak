import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <div className='flex items-center'>
            <div className="text-sidebar-primary-foreground flex aspect-square size-10 items-center justify-center rounded-md">
                <AppLogoIcon className="w-20" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">WEBGIS Drainase</span>
            </div>
        </div>
    );
}
