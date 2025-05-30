import React from "react";
import { ConnectionConfig } from "@/components/connections/connection-config";
import { ConnectionHistory } from "@/components/connections/connection-history";
import { DBConnectionSpec } from "@/state/connections-database/configs";

interface ConnectionContentProps {
  currentSpec: DBConnectionSpec;
  onSpecChange: (spec: DBConnectionSpec) => void;
  onSpecSave?: (spec: DBConnectionSpec) => void;
}

export function ConnectionContent({ currentSpec, onSpecChange, onSpecSave }: ConnectionContentProps) {
  return (
    <div className="p-4">
      <h5 className="text-lg font-bold">Database Connections</h5>
      <p className="text-muted-foreground mb-2">
        Configure how you would like to connect to DuckDB.
      </p>
      <div className="flex flex-col gap-4">
        <ConnectionHistory
          onSpecSelected={onSpecChange}
        />
        <ConnectionConfig
          spec={currentSpec}
          onSpecChange={onSpecChange}
          onSpecSave={onSpecSave}
        />
      </div>
    </div>
  );
}