export async function setup() {
  // Global test setup
}

export async function teardown() {
  // Ensure clean exit after all tests complete
  setTimeout(() => {
    process.exit(0);
  }, 1000).unref();
}
