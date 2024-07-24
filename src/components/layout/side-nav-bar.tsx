

export function SideNavBar() {
    // very slim side nav bar on the left side of the screen
    return (
        <div className="flex flex-col h-screen">
            <div className="flex flex-col items-center bg-gray-800
            w-16 h-full text-white">
                <div className="flex flex-col items-center justify-center
                h-16 w-full">
                    <div className="h-4 w-4 bg-white rounded-full"></div>
                    <div className="h-4 w-4 bg-white rounded-full my-1"></div>
                    <div className="h-4 w-4 bg-white rounded-full"></div>
                </div>
            </div>
        </div>
    );

}