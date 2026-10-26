import {describe, expect, it} from "vitest";
import {parseProjectConfig, projectConfigText} from "@/state/projects/project-config";

describe('dash.yaml', () => {
    it('is written for a folder without one', () => {
        expect(parseProjectConfig(projectConfigText(undefined, 'k3x9q2', 'Sales: Q3'))).toEqual({id: 'k3x9q2', name: 'Sales: Q3'});
    });

    it('keeps other keys and comments when renamed', () => {
        const text = projectConfigText('# mine\nid: k3x9q2\nname: Old\nowner: ana\n', 'k3x9q2', 'New');
        expect(text).toContain('# mine');
        expect(text).toContain('owner: ana');
        expect(parseProjectConfig(text)).toEqual({id: 'k3x9q2', name: 'New'});
    });

    it('reads nothing from a missing or odd file', () => {
        expect(parseProjectConfig(undefined)).toEqual({});
        expect(parseProjectConfig('id: 12\n')).toEqual({id: undefined, name: undefined});
    });
});
