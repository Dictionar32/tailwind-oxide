/**
 * Example usage of lazyAsync
 */
import { lazyAsync } from './lazyAsync';

async function main() {
  // Example: lazy load some expensive data
  const loadData = async (): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return 'loaded data';
  };

  // First call - triggers loader
  const result1 = await lazyAsync(loadData);
  console.log('First call:', result1);

  // Second call - returns cached value
  const result2 = await lazyAsync(loadData);
  console.log('Second call:', result2);
}

main().catch(console.error);