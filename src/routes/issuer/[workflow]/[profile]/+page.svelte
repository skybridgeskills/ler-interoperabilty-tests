<script lang="ts">
	import { WorkflowChecklist } from '$lib/components/interop/workflow-checklist/index.js';

	let { data } = $props();
</script>

<WorkflowChecklist
	checklist={data.checklist}
	profile={data.profile}
	workflow={data.workflow}
	role={data.role}
/>
