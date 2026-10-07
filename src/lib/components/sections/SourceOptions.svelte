<script lang="ts">
	import { archiveUrl, isPMTilesUrl } from '../../style/pmtiles';
	import {
		sourceStatus,
		sourceUrl,
		vectorSchema,
		MAPTERHORN_TILES,
		SCHEMA_OPTIONS,
		type LoadedTileJSON,
		type Provider,
		type SourceConfig,
		type SourceName,
		type SourceStatus,
		type VectorSchema,
	} from '../../style/sources';
	import InputSelect from '../inputs/InputSelect.svelte';

	let {
		provider,
		providers,
		config,
		tileJSONs,
		pmtiles,
		server,
		onprovider,
		onconfig,
	}: {
		provider: Provider;
		/** The providers to choose from; a single one leaves the choice out. */
		providers: { value: Provider; label: string }[];
		config: SourceConfig;
		/** What loading each source gave: `undefined` while it loads, `null` when it failed. */
		tileJSONs: Record<SourceName, LoadedTileJSON | undefined>;
		/** Whether the map can read PMTiles archives. */
		pmtiles: boolean;
		/** The sources of the VersaTiles server at an origin. */
		server: (origin: string) => SourceConfig;
		onprovider: (provider: Provider) => void;
		onconfig: (config: SourceConfig) => void;
	} = $props();

	const uid = $props.id();

	const ELEVATION_SOURCES = [
		{ value: '', label: 'None' },
		{ value: MAPTERHORN_TILES, label: 'Mapterhorn' },
	];

	function status(name: SourceName): SourceStatus {
		const url = config[name];
		if (url !== undefined && isPMTilesUrl(url) && !pmtiles) {
			return { state: 'error', text: 'This page cannot read PMTiles archives.' };
		}
		return sourceStatus(name, url, tileJSONs[name], config.schema);
	}

	/** The schema has to be chosen for vector tiles whose layers do not tell it. */
	let schemaUnknown = $derived(
		config.schema !== undefined ||
			(tileJSONs.vector != null && vectorSchema(tileJSONs.vector) === undefined)
	);

	/** The config with one of its addresses replaced, or removed by empty text. */
	function withUrl(name: SourceName, text: string): SourceConfig {
		const { [name]: _previous, ...rest } = config;
		const url = sourceUrl(text);
		// Another tileset has a schema of its own.
		if (name === 'vector') delete rest.schema;
		return url === undefined ? rest : { ...rest, [name]: url };
	}

	const value = (e: Event) => (e.target as HTMLInputElement).value;
</script>

<!-- An address someone types, with what loading it gave below. -->
{#snippet address(name: SourceName, label: string, placeholder: string)}
	{@const state = status(name)}
	<div class="entry text-container">
		<label for="{uid}-{name}">{label}</label>
		<div class="input">
			<input
				id="{uid}-{name}"
				type="text"
				value={archiveUrl(config[name] ?? '')}
				{placeholder}
				onchange={(e) => onconfig(withUrl(name, value(e)))}
			/>
		</div>
		{#if state.state !== 'none'}
			<p class="source-status" class:error={state.state === 'error'}>{state.text}</p>
		{/if}
	</div>
{/snippet}

<!-- A source that is not typed: what it is, read from what loading it gave. -->
{#snippet found(name: SourceName, label: string, missing: string)}
	{@const state = status(name)}
	<div class="entry source-found">
		<span class="label">{label}</span>
		<span class="source-status" class:error={state.state === 'error' && !missing}>
			{state.state === 'error' && missing ? missing : state.text}
		</span>
	</div>
{/snippet}

{#if providers.length > 1}
	<InputSelect
		label="Provider"
		bind:value={() => provider, (next) => onprovider(next as Provider)}
		defaultValue={undefined}
		modified={false}
		options={providers}
	/>
{/if}

{#if provider === 'versatiles'}
	<div class="entry text-container">
		<label for="{uid}-origin">Origin</label>
		<div class="input">
			<input
				id="{uid}-origin"
				type="text"
				value={config.assets}
				onchange={(e) => onconfig(server(value(e).trim()))}
			/>
		</div>
	</div>
	<!-- A server need not have every tileset: one that is missing is no mistake. -->
	{@render found('vector', 'Vector tiles', 'Not on this server')}
	{@render found('satellite', 'Satellite', 'Not on this server')}
	{@render found('elevation', 'Elevation', 'Not on this server')}
{:else if provider === 'custom'}
	{@render address('vector', 'Vector tiles', 'TileJSON or PMTiles address')}
	{#if schemaUnknown}
		<InputSelect
			label="Schema"
			hint="The layers of these tiles do not tell their schema. The style is built for the one chosen here."
			bind:value={
				() => config.schema ?? 'shortbread',
				(schema) => onconfig({ ...config, schema: schema as VectorSchema })
			}
			defaultValue={undefined}
			modified={false}
			options={SCHEMA_OPTIONS}
		/>
	{/if}
	{@render address('satellite', 'Satellite', 'TileJSON or PMTiles address')}
	{@render address('elevation', 'Elevation', 'TileJSON address')}
	<div class="entry text-container">
		<label for="{uid}-assets">Fonts & icons</label>
		<div class="input">
			<input
				id="{uid}-assets"
				type="text"
				value={config.assets}
				onchange={(e) => value(e).trim() && onconfig({ ...config, assets: value(e).trim() })}
			/>
		</div>
	</div>
{:else}
	{#if provider === 'protomaps'}
		{@render address('vector', 'Archive', 'PMTiles address')}
	{:else}
		{@render found('vector', 'Vector tiles', '')}
	{/if}
	<InputSelect
		label="Elevation"
		hint="These tiles come without elevation data. Mapterhorn provides it for terrain and hillshade."
		bind:value={() => config.elevation ?? '', (url) => onconfig(withUrl('elevation', url ?? ''))}
		defaultValue={undefined}
		modified={false}
		options={ELEVATION_SOURCES}
	/>
{/if}
