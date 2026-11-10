import { defineConfig } from '@hey-api/openapi-ts';

// SDK генерируется из OpenAPI-спецификации контракта (см. README):
// contract/main.tsp -> contract/openapi.yaml -> client/src/api/generated/
export default defineConfig({
  input: '../contract/openapi.yaml',
  output: 'src/api/generated',
});
