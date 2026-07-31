import {createWithEqualityFn} from "zustand/traditional";
import {toast} from "sonner";
import {setDatabaseConnection, tryInitializingConnectionFromHistory} from "@/state/init/initialize-connections";
import {useGUIState} from "@/state/gui.state";
import {NO_CONNECTION_FORCE_OPEN_REASON} from "@/components/settings/settings-dialog";
import {connectionToSpec, connectionToString, DBConnectionSpec, specToConnection} from "@/state/connections/configs";
import {DatabaseConnection} from "@/model/database-connection";
import {loadProjectsIntoStore, useProjectsState} from "@/state/projects.state";
import {maybeAttachDatabaseFromUrlParam} from "@/state/init/attach-from-url-param";
import {isDebugMode} from "@/components/settings/about-content";
import {persist} from "zustand/middleware";
import {loadOrSwitchProject} from "@/state/init/load-or-switch-project";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";


export type InitStep =
    'loading-stored-connections-configs' |
    'loaded-stored-connections-configs' |
    'selecting-connection' |
    'connection-connected-successfully' |
    'loading-projects' |
    'loading-project'|
    'loading-project-connections' |
    'loading-project-relations' |
    'loading-project-macros'|
    'loading-project-cached-results' |
    'closing-current-project' |
    'updating-gui-state' |
    'loading-last-used-relations' |
    'attaching-database-from-url-param' |
    'complete'

export function getStepLabel(step: InitStep): string {
    switch (step) {
        case 'loading-stored-connections-configs':
            return 'Loading stored connections configs';
        case 'loaded-stored-connections-configs':
            return 'Loaded stored connections configs';
        case 'selecting-connection':
            return 'Selecting connection';
        case 'connection-connected-successfully':
            return 'Database connected successfully';
        case 'loading-projects':
            return 'Loading projects';
        case 'loading-project':
            return 'Loading current project';
        case 'loading-project-connections':
            return 'Loading Project Connections';
        case 'loading-project-relations':
            return 'Loading Project Relations';
        case 'loading-project-macros':
            return 'Loading Project Macros';
        case 'loading-project-cached-results':
            return 'Loading Project Cached Results';
        case 'closing-current-project':
            return 'Closing current project';
        case 'updating-gui-state':
            return 'Updating Interface';
        case 'loading-last-used-relations':
            return 'Loading data for display elements';
        case 'attaching-database-from-url-param':
            return 'Loading database from URL';
        case 'complete':
            return 'Initialization complete';
    }
}


export interface InitZustand {
    currentStep: InitStep;
    connectionHistory: DBConnectionSpec[];
    initializationComplete: () => boolean;
    setStep: (step: InitStep) => void;
    getCurrentStepLabel: () => string;
    loadConnectionConfig: () => void;
    checkSelectedConnectionSpec: (spec: DBConnectionSpec) => void;
    initializeWorkingConnection: (connection: DatabaseConnection) => void;
    loadProjectDatabase: () => void;
    checkForProjectToLoad: () => void;
    loadProject(id: string): Promise<void>;
    onRelationStateLoadedFromConnection: (loadedTabIds: string[]) => void;

    navigateToProjectsList: () => void;

    addConnectionToHistory: (connection: DatabaseConnection) => void;
    removeConnectionFromHistory: (index: number) => void;
}


// Overview
// 1. Load connection config from
//      (a) url parameters (higher prio)
//      (b) connection history coming from local storage
// if working connecction found:
//      initializeWorkingConnection()
// else:
//      show connection config dialog to select a connection
//      on select initializeWorkingConnection()
//
// 2. loadProjectDatabase -> Load list of projects from duckdb file
// 3. checkForProjectToLoad()
//       - Yes, we are at a project that exists: Load the project
//       - No, we are not at a project: Go to projects list


export const useInitState = createWithEqualityFn(persist<InitZustand>((set, get) => ({
        currentStep: 'loading-stored-connections-configs',
        connectionHistory: [],

        initializationComplete: () => {
            return get().currentStep === 'complete';
        },

        getCurrentStepLabel: () => {
            return getStepLabel(get().currentStep);
        },

        setStep: (step: InitStep) => {
            console.log(`Initializing step: ${step}`);
            set({currentStep: step});
        },


        // Step 1. Load the connection configs from the zustand state. This might lead to a side quest opening the
        // settings dialog to select a connection
        loadConnectionConfig: async () => {

            get().setStep('loaded-stored-connections-configs');
            const history = get().connectionHistory;
            const connection = await tryInitializingConnectionFromHistory(history);
            // if there is no connection, we need to show the connection config
            if (!connection) {
                get().setStep('selecting-connection');
                toast.error('No viable database connection found');
                useGUIState.getState().addSettingForceOpenReason(NO_CONNECTION_FORCE_OPEN_REASON)
                return;
            } else { // success, go to the next step
                get().initializeWorkingConnection(connection);

            }
        },

        // Step 1.1. The user selected a connection spec. Check if it is working
        checkSelectedConnectionSpec: async (spec: DBConnectionSpec) => {
            const connection = specToConnection(spec);
            await connection.initialise();
            const status = await connection.checkConnectionState();
            if (status.state === 'connected') {
                // go to the next step
                get().initializeWorkingConnection(connection);
            } else {
                // we can't go to the next step, so we show an error
                toast.error('Failed to connect to database');
            }
        },

        // Step 3. A working connection was selected, we can now set it in the state
        initializeWorkingConnection: async (connection: DatabaseConnection) => {

            useGUIState.getState().removeSettingForceOpenReason(
                NO_CONNECTION_FORCE_OPEN_REASON, true
            );

            get().setStep('selecting-connection');

            // show toast that connection is initialized
            const isDebug = isDebugMode();
            const text = connectionToString(connection, isDebug);
            toast.success(text);

            // set the connection in the state
            await setDatabaseConnection(connection);

            get().loadProjectDatabase();
        },

        loadProjectDatabase: async () => {
            // load the projects registry from the connection's meta database
            get().setStep('loading-projects');
            try {
                await loadProjectsIntoStore();
                get().checkForProjectToLoad();
            } catch (e) {
                logAndDisplayError('Failed to load the projects registry; continuing with the default project list', e);
            }
        },
        checkForProjectToLoad: async () => {
            // The URL decides which project is open
            const dashLocation = DashNavigator.instance().getCurrentLocation();
            if (dashLocation.basePath !== 'project') {
                get().setStep('complete')
            }
            if (dashLocation.basePath === 'project') {
                const projectId = dashLocation.projectId;
                const projectExists = useProjectsState.getState().doesProjectExists(projectId);
                if (!projectExists) {
                    logAndDisplayError(`Project with ID ${projectId} not found; redirecting to the projects list`, null);
                    get().navigateToProjectsList();
                } else {
                    await get().loadProject(projectId);
                }
            }
        },
        navigateToProjectsList: () => {
            get().setStep('complete');
            DashNavigator.instance().navigateToLocation(DashLocations.ProjectsList());
        },
        // Step 4. The relations have been loaded from the connection.
        onRelationStateLoadedFromConnection: async (loadedTabIds: string[]) => {
            get().setStep('updating-gui-state');

            get().setStep('attaching-database-from-url-param');
            await maybeAttachDatabaseFromUrlParam();
        },


        // ** PROJECT FUNCTIONS ***
        async loadProject(id: string) {
            get().setStep('loading-project')
            await loadOrSwitchProject(id); // will call 'completed'
        },


        // *** META FUNCTIONS ***
        addConnectionToHistory: (connection: DatabaseConnection) => {

            // add this connection to the history. The newest connection is always at the beginning
            const history_copy = [...get().connectionHistory];
            const new_element: DBConnectionSpec = connectionToSpec(connection);
            // if there is already an element with the same config, remove it
            const index = history_copy.findIndex((element) => {
                return JSON.stringify(element) === JSON.stringify(new_element);
            });
            if (index !== -1) {
                // remove the element from the history
                history_copy.splice(index, 1);
            }

            // if there are more than 10 elements, remove from the head of the array
            if (history_copy.length > 10) {
                history_copy.shift();
            }

            // add the new element at the end of the array
            history_copy.push(new_element);

            set({connectionHistory: history_copy});
        },

        removeConnectionFromHistory: (index: number) => {
            const history_copy = [...get().connectionHistory];
            if (index >= 0 && index < history_copy.length) {
                history_copy.splice(index, 1);
                set({connectionHistory: history_copy});
            }
        }


    }),
    {
        name: 'init-state',
        version: 1,
        onRehydrateStorage: () => (state, error) => {
            if (error || !state) {
                console.error('Failed to rehydrate init state:', error);
            } else {
                // Initialize the state with the first step
                state.loadConnectionConfig();
            }
        },
    }
))


function logAndDisplayError(error_text: string, e: any) {
    toast.error(error_text);
    console.error(error_text, e);
}