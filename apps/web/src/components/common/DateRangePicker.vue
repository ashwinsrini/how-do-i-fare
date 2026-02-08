<script setup>
import DatePicker from 'primevue/datepicker';

const props = defineProps({
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
});

const emit = defineEmits(['update:startDate', 'update:endDate']);

function onStartDateChange(value) {
  emit('update:startDate', value);
}

function onEndDateChange(value) {
  emit('update:endDate', value);
}
</script>

<template>
  <div class="flex items-center gap-4 flex-wrap">
    <div class="flex flex-col gap-1">
      <label class="tm-label">Start Date</label>
      <DatePicker
        :modelValue="startDate"
        @update:modelValue="onStartDateChange"
        dateFormat="yy-mm-dd"
        placeholder="Select start date"
        showIcon
        :maxDate="endDate || undefined"
        class="w-48"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label class="tm-label">End Date</label>
      <DatePicker
        :modelValue="endDate"
        @update:modelValue="onEndDateChange"
        dateFormat="yy-mm-dd"
        placeholder="Select end date"
        showIcon
        :minDate="startDate || undefined"
        class="w-48"
      />
    </div>
  </div>
</template>
