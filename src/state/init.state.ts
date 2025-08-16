import {createWithEqualityFn} from "zustand/traditional";
import {DatabaseConnectionZustandState, useDatabaseConState} from "@/state/connections.state";
import {toast} from "sonner";
import {tryInitializingConnectionFromHistory} from "@/state/init/initialize-connections";
import {useGUIState} from "@/state/gui.state";
import {NO_CONNECTION_FORCE_OPEN_REASON} from "@/components/settings/settings-view";
import {connectionToString, DBConnectionSpec, specToConnection} from "@/state/connections/configs";
import {showExampleQuery} from "@/state/init/show-example-query";
import {DatabaseConnection} from "@/model/database-connection";
import {loadRelationStateFromConnections} from "@/state/persistency/api";
import {maybeAttachDatabaseFromUrlParam} from "@/state/init/attach-from-url-param";
import {useRelationDataState} from "@/state/relations-data.state";


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
    initializationComplete: () => boolean;
    setStep: (step: InitStep) => void;
    getCurrentStepLabel: () => string;
    onConnectionConfigLoaded: (config: DatabaseConnectionZustandState) => void;
    onConnectionSpecSelected: (spec: DBConnectionSpec) => void;
    onWorkingConnectionSelected: (connection: DatabaseConnection) => void;
    onRelationStateLoadedFromConnection: (loadedTabIds: string[]) => void;
}

export const useInitState = createWithEqualityFn<InitZustand>((set, get) => ({
    currentStep: 'loading-stored-connections-configs',

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
    onConnectionConfigLoaded: async (config: DatabaseConnectionZustandState) => {

        get().setStep('loaded-stored-connections-configs');
        const connection = await tryInitializingConnectionFromHistory(config.history)
        console.log('onConnectionConfigLoaded', connection, config.history);
        // if there is no connection, we need to show the connection config
        if (!connection) {
            get().setStep('selecting-connection');
            toast.error('No viable database connection found');
            useGUIState.getState().addSettingForceOpenReason(NO_CONNECTION_FORCE_OPEN_REASON)
            return;
        } else{ // success, go to the next step
            get().onWorkingConnectionSelected(connection);

        }
    },

    // Step 1.1. The user selected a connection spec. Check if it is working
    onConnectionSpecSelected: async (spec: DBConnectionSpec) => {
        const connection = specToConnection(spec);
        console.log('onConnectionSpecSelected', spec);
        console.log('Starting connection initialization', connection)
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
        await useDatabaseConState.getState().setDatabaseConnection(connection);

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
    }
}));