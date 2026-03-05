<script lang="ts">
	import { onMount } from 'svelte';
	import NavProjects from "./nav-projects.svelte";
	import NavUser from "./nav-user.svelte";
	import TeamSwitcher from "./team-switcher.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { ComponentProps } from "svelte";
	import { workspaces, projects } from '$lib/api';
	import { currentUser } from '$lib/stores/auth';
	import {
		selectWorkspace,
		getStoredWorkspaceId,
		workspaceProjects,
		workspaceList,
		markWorkspaceReady,
		setWorkspaceList,
		addToWorkspaceList
	} from '$lib/stores/workspace';
	import type { Workspace, Project } from '$lib/api';

	let {
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();

	let activeWorkspace = $state<Workspace | null>(null);
	let projectList     = $state<Project[]>([]);

	$effect(() => { projectList = $workspaceProjects; });

	async function loadProjects(workspace: Workspace): Promise<Project[]> {
		try {
			return (await projects.list(workspace.id)) ?? [];
		} catch {
			return [];
		}
	}

	async function handleWorkspaceSelect(workspace: Workspace): Promise<void> {
		const projs = await loadProjects(workspace);
		selectWorkspace(workspace, projs);
		activeWorkspace = workspace;
	}

	function handleWorkspaceCreate(workspace: Workspace): void {
		addToWorkspaceList(workspace);
	}

	onMount(async () => {
		const user = $currentUser;
		if (!user) {
			markWorkspaceReady();
			return;
		}

		let list: Workspace[] = [];
		try {
			list = await workspaces.listByUser(user.id);
		} catch {
			list = [];
		}

		setWorkspaceList(list);

		if (list.length === 0) {
			markWorkspaceReady();
			return;
		}

		const storedId = getStoredWorkspaceId();
		const initial = list.find(w => w.id === storedId) ?? list[0];
		try {
			await handleWorkspaceSelect(initial);
		} catch {
			markWorkspaceReady();
		}
	});
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<TeamSwitcher
			workspaces={$workspaceList}
			selected={activeWorkspace}
			onSelect={handleWorkspaceSelect}
			onCreate={handleWorkspaceCreate}
		/>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavProjects projects={projectList} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
