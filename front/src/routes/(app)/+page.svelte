<script lang="ts">
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import LayoutIcon from "@lucide/svelte/icons/layout";
	import BuildingIcon from "@lucide/svelte/icons/building-2";
	import FolderIcon from "@lucide/svelte/icons/folder";
	import {
		selectedWorkspace,
		workspaceProjects,
		workspaceReady,
		selectWorkspace,
		addWorkspaceProject,
		addToWorkspaceList
	} from '$lib/stores/workspace';
	import { workspaces as workspacesApi, projects as projectsApi } from '$lib/api';
	import { currentUser } from '$lib/stores/auth';
	import * as m from '$lib/paraglide/messages';
	import { i18n } from '$lib/i18n.svelte';

	const t = $derived.by(() => {
		i18n.locale;
		return {
			noWorkspaceTitle: m.dashboard_no_workspace_title(),
			noWorkspaceDesc:  m.dashboard_no_workspace_desc(),
			noProjectsTitle:  m.dashboard_no_projects_title(),
			noProjectsDesc:   m.dashboard_no_projects_desc(),
			createWorkspace:  m.workspace_create(),
			createProject:    m.project_create(),
			name:             m.workspace_name(),
			slug:             m.workspace_slug(),
			slugHint:         m.workspace_slug_hint(),
			key:              m.project_key(),
			keyHint:          m.project_key_hint(),
			cancel:           m.workspace_cancel(),
			creating:         m.workspace_creating(),
			projects:         m.nav_projects()
		};
	});

	// --- Workspace sheet ---
	let wsSheetOpen   = $state(false);
	let wsName        = $state('');
	let wsSlug        = $state('');
	let wsError       = $state('');
	let wsSaving      = $state(false);

	function toSlug(v: string) {
		return v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
	}
	function onWsNameInput(e: Event) {
		wsName = (e.target as HTMLInputElement).value;
		wsSlug = toSlug(wsName);
	}
	function resetWsForm() { wsName = ''; wsSlug = ''; wsError = ''; wsSaving = false; }

	async function handleCreateWorkspace(e: SubmitEvent) {
		e.preventDefault();
		wsError = '';
		wsSaving = true;
		try {
			const ws = await workspacesApi.create({ name: wsName.trim(), slug: wsSlug.trim(), owner_id: $currentUser!.id });
			addToWorkspaceList(ws);
			selectWorkspace(ws, []);
			wsSheetOpen = false;
			resetWsForm();
		} catch (err) {
			wsError = err instanceof Error ? err.message : 'Failed to create workspace';
		} finally {
			wsSaving = false;
		}
	}

	// --- Project sheet ---
	let projSheetOpen = $state(false);
	let projName      = $state('');
	let projKey       = $state('');
	let projError     = $state('');
	let projSaving    = $state(false);

	function toKey(v: string) {
		return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
	}
	function onProjNameInput(e: Event) {
		projName = (e.target as HTMLInputElement).value;
		projKey  = toKey(projName);
	}
	function resetProjForm() { projName = ''; projKey = ''; projError = ''; projSaving = false; }

	async function handleCreateProject(e: SubmitEvent) {
		e.preventDefault();
		projError = '';
		projSaving = true;
		try {
			const project = await projectsApi.create($selectedWorkspace!.id, {
				name: projName.trim(),
				key:  projKey.trim()
			});
			addWorkspaceProject(project);
			projSheetOpen = false;
			resetProjForm();
		} catch (err) {
			projError = err instanceof Error ? err.message : 'Failed to create project';
		} finally {
			projSaving = false;
		}
	}

	const projects = $derived($workspaceProjects ?? []);
</script>

{#if !$workspaceReady}
	<div class="space-y-3 p-4">
		<Skeleton class="h-6 w-48" />
		<Skeleton class="h-4 w-80" />
		<Skeleton class="h-4 w-64" />
	</div>
{:else if !$selectedWorkspace}
	<Empty.Root class="border border-dashed">
		<Empty.Header>
			<Empty.Media variant="icon"><BuildingIcon /></Empty.Media>
			<Empty.Title>{t.noWorkspaceTitle}</Empty.Title>
			<Empty.Description>{t.noWorkspaceDesc}</Empty.Description>
		</Empty.Header>
		<Empty.Content>
			<Button onclick={() => { wsSheetOpen = true; }}>{t.createWorkspace}</Button>
		</Empty.Content>
	</Empty.Root>
{:else if projects.length === 0}
	<Empty.Root class="border border-dashed">
		<Empty.Header>
			<Empty.Media variant="icon"><LayoutIcon /></Empty.Media>
			<Empty.Title>{t.noProjectsTitle}</Empty.Title>
			<Empty.Description>{t.noProjectsDesc}</Empty.Description>
		</Empty.Header>
		<Empty.Content>
			<Button onclick={() => { projSheetOpen = true; }}>{t.createProject}</Button>
		</Empty.Content>
	</Empty.Root>
{:else}
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">{t.projects}</h2>
			<Button variant="outline" size="sm" onclick={() => { projSheetOpen = true; }}>
				{t.createProject}
			</Button>
		</div>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each projects as project (project.id)}
				<a
					href="/projects/{project.id}"
					class="group flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
				>
					<div class="flex items-start justify-between gap-2">
						<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
							<FolderIcon class="h-4 w-4" />
						</div>
						<span class="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
							{project.key}
						</span>
					</div>
					<div>
						<p class="font-medium leading-tight group-hover:text-primary">{project.name}</p>
						{#if project.description}
							<p class="mt-1 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}

<!-- Create workspace -->
<Sheet.Root bind:open={wsSheetOpen} onOpenChange={(open) => { if (!open) resetWsForm(); }}>
	<Sheet.Portal>
		<Sheet.Overlay />
		<Sheet.Content side="right" class="w-96">
			<Sheet.Header>
				<Sheet.Title>{t.createWorkspace}</Sheet.Title>
			</Sheet.Header>
			<form onsubmit={handleCreateWorkspace} class="flex flex-col gap-4 p-6">
				<div class="flex flex-col gap-1.5">
					<label for="ws-name" class="text-sm font-medium">{t.name}</label>
					<Input id="ws-name" placeholder="Acme Corp" value={wsName} oninput={onWsNameInput} required />
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="ws-slug" class="text-sm font-medium">{t.slug}</label>
					<Input id="ws-slug" placeholder="acme-corp" bind:value={wsSlug} required />
					<p class="text-xs text-muted-foreground">{t.slugHint}</p>
				</div>
				{#if wsError}<p class="text-sm text-destructive">{wsError}</p>{/if}
				<div class="flex justify-end gap-2 pt-2">
					<Sheet.Close><Button variant="outline" type="button">{t.cancel}</Button></Sheet.Close>
					<Button type="submit" disabled={wsSaving || !wsName.trim() || !wsSlug.trim()}>
						{wsSaving ? t.creating : t.createWorkspace}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Portal>
</Sheet.Root>

<!-- Create project -->
<Sheet.Root bind:open={projSheetOpen} onOpenChange={(open) => { if (!open) resetProjForm(); }}>
	<Sheet.Portal>
		<Sheet.Overlay />
		<Sheet.Content side="right" class="w-96">
			<Sheet.Header>
				<Sheet.Title>{t.createProject}</Sheet.Title>
			</Sheet.Header>
			<form onsubmit={handleCreateProject} class="flex flex-col gap-4 p-6">
				<div class="flex flex-col gap-1.5">
					<label for="proj-name" class="text-sm font-medium">{t.name}</label>
					<Input id="proj-name" placeholder="My Project" value={projName} oninput={onProjNameInput} required />
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="proj-key" class="text-sm font-medium">{t.key}</label>
					<Input id="proj-key" placeholder="PROJ" bind:value={projKey} required />
					<p class="text-xs text-muted-foreground">{t.keyHint}</p>
				</div>
				{#if projError}<p class="text-sm text-destructive">{projError}</p>{/if}
				<div class="flex justify-end gap-2 pt-2">
					<Sheet.Close><Button variant="outline" type="button">{t.cancel}</Button></Sheet.Close>
					<Button type="submit" disabled={projSaving || !projName.trim() || !projKey.trim()}>
						{projSaving ? t.creating : t.createProject}
					</Button>
				</div>
			</form>
		</Sheet.Content>
	</Sheet.Portal>
</Sheet.Root>
