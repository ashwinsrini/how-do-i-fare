<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Skeleton from 'primevue/skeleton';

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    required: true,
    // Each column: { field, header, sortable?, type? }
  },
  loading: {
    type: Boolean,
    default: false,
  },
  emptyMessage: {
    type: String,
    default: 'No data available.',
  },
});

const skeletonRows = Array.from({ length: 5 }, (_, i) => ({ _skeletonId: i }));
</script>

<template>
  <div>
    <!-- Loading skeleton state -->
    <DataTable
      v-if="loading"
      :value="skeletonRows"
      class="p-datatable-sm"
    >
      <Column header="#" style="width: 4rem">
        <template #body>
          <Skeleton width="2rem" height="1rem" />
        </template>
      </Column>
      <Column
        v-for="col in columns"
        :key="'skeleton-' + col.field"
        :header="col.header"
      >
        <template #body>
          <Skeleton width="80%" height="1rem" />
        </template>
      </Column>
    </DataTable>

    <!-- Data table -->
    <DataTable
      v-else
      :value="data"
      stripedRows
      class="p-datatable-sm"
      responsiveLayout="scroll"
      sortMode="single"
      removableSort
    >
      <!-- Rank column -->
      <Column header="#" style="width: 4rem">
        <template #body="{ index }">
          <span class="font-semibold text-surface-400">{{ index + 1 }}</span>
        </template>
      </Column>

      <!-- Dynamic columns -->
      <Column
        v-for="col in columns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :sortable="col.sortable !== false"
      >
        <template #body="slotProps">
          <!-- Custom cell slot -->
          <slot
            :name="'cell-' + col.field"
            :data="slotProps.data"
            :field="col.field"
            :value="slotProps.data[col.field]"
          >
            <!-- Default rendering by type -->
            <template v-if="col.type === 'number'">
              <span class="font-medium">{{
                slotProps.data[col.field] != null
                  ? Number(slotProps.data[col.field]).toLocaleString()
                  : '-'
              }}</span>
            </template>
            <template v-else>
              {{ slotProps.data[col.field] ?? '-' }}
            </template>
          </slot>
        </template>
      </Column>

      <!-- Empty state -->
      <template #empty>
        <div class="flex flex-col items-center justify-center py-8 text-surface-400">
          <i class="pi pi-inbox text-4xl mb-2"></i>
          <p>{{ emptyMessage }}</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>
