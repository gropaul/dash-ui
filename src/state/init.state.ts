import {createWithEqualityFn} from "zustand/traditional";
import {toast} from "sonner";
import {setDatabaseConnection, tryInitializingConnectionFromHistory} from "@/state/init/initialize-connections";
import {useGUIState} from "@/state/gui.state";
import {NO_CONNECTION_FORCE_OPEN_REASON} from "@/components/settings/settings-view";
import {connectionToSpec, connectionToString, DBConnectionSpec, specToConnection} from "@/state/connections/configs";
import {showExampleQuery} from "@/state/init/show-example-query";
import {DatabaseConnection} from "@/model/database-connection";
import {loadRelationStateFromConnections} from "@/state/persistency/api";
import {maybeAttachDatabaseFromUrlParam} from "@/state/init/attach-from-url-param";
import {useRelationDataState} from "@/state/relations-data.state";
import {persist} from "zustand/middleware";


export type InitStep =
    'loading-stored-connections-configs' |
    'loaded-stored-connections-configs' |
    'selecting-connection' |
    'connection-connected-successfully' |
    'loading-relations-from-connection' |
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
        case 'loading-relations-from-connection':
            return 'Loading display elements from database';
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
    onInitStateHydrated: () => void;
    onConnectionSpecSelected: (spec: DBConnectionSpec) => void;
    onWorkingConnectionSelected: (connection: DatabaseConnection) => void;
    onRelationStateLoadedFromConnection: (loadedTabIds: string[]) => void;

    addConnectionToHistory: (connection: DatabaseConnection) => void;
    removeConnectionFromHistory: (index: number) => void;
}

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
            set({currentStep: step});
        },

        // Step 1. Load the connection configs from the zustand state. This might lead to a side quest opening the
        // settings dialog to select a connection
        onInitStateHydrated: async () => {

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
                get().onWorkingConnectionSelected(connection);

            }
        },

        // Step 1.1. The user selected a connection spec. Check if it is working
        onConnectionSpecSelected: async (spec: DBConnectionSpec) => {
            const connection = specToConnection(spec);
            await connection.initialise();
            const status = await connection.checkConnectionState();
            if (status.state === 'connected') {
                // go to the next step
                get().onWorkingConnectionSelected(connection);
            } else {
                // we can't go to the next step, so we show an error
                toast.error('Failed to connect to database');
            }
        },

        // Step 3. A working connection was selected, we can now set it in the state
        onWorkingConnectionSelected: async (connection: DatabaseConnection) => {

            useGUIState.getState().removeSettingForceOpenReason(
                NO_CONNECTION_FORCE_OPEN_REASON, true
            );

            get().setStep('selecting-connection');

            // show toast that connection is initialized
            const isDebug = process.env.NODE_ENV === 'development';
            const text = connectionToString(connection, isDebug);
            toast.success(text);

            // set the connection in the state and show the example query
            await setDatabaseConnection(connection);

            // initialize step 4, when everything is working onRelationStateLoadedFromConnection will be called
            get().setStep('loading-relations-from-connection');
            loadRelationStateFromConnections(connection);
        },

        // Step 4. The relations have been loaded from the connection.
        onRelationStateLoadedFromConnection: async (loadedTabIds: string[]) => {
            // remove all the tabs that were not loaded from the relation state
            get().setStep('updating-gui-state');
            useGUIState.getState().keepTabsOfIds(loadedTabIds);

            // load the last used relations
            get().setStep('loading-last-used-relations');
            await useRelationDataState.getState().loadLastUsed();

            get().setStep('attaching-database-from-url-param');
            await maybeAttachDatabaseFromUrlParam();

            // we are done!
            get().setStep('complete');

            // some final steps that need no sync at this point
            await showExampleQuery()
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
                state.onInitStateHydrated();
            }


        },
    }
))
