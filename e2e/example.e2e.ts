import { test, expect } from '@playwright/test';

/**
 * Example Playwright Test
 * 
 * This is a simple example to show the structure of a Playwright test.
 * We'll delete this file once we write real tests.
 * 
 * LEARNING NOTE: This test just verifies that Playwright can open your
 * application. It's a "hello world" for E2E testing.
 */

test.describe('Example Test Suite', () => {
  /**
   * This test navigates to the home page and verifies it loads.
   * 
   * LEARNING NOTE: Breaking down what's happening:
   * 
   * 1. test() - Defines a single test case
   * 2. async ({ page }) - Every test gets a fresh browser page
   * 3. await page.goto('/') - Navigate to the home page (baseURL + '/')
   * 4. await expect(page).toHaveTitle() - Verify the page title
   * 
   * The 'await' keyword means "wait for this to complete before continuing".
   * Playwright actions are asynchronous because they take time (loading pages,
   * clicking buttons, etc.).
   */
  test('should load the home page', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    
    // Verify the page loaded by checking the title
    // This should match the <title> tag in your index.html
    await expect(page).toHaveTitle(/Jeopardy/i);
    
    // LEARNING NOTE: The /Jeopardy/i is a regular expression:
    // - /.../ means "this is a pattern to match"
    // - i means "case-insensitive" (matches "Jeopardy", "jeopardy", "JEOPARDY")
  });

  /**
   * This test demonstrates basic element interaction.
   * 
   * LEARNING NOTE: Playwright provides many ways to find elements:
   * - getByRole() - Find by ARIA role (button, link, textbox, etc.)
   * - getByText() - Find by visible text
   * - getByLabel() - Find by form label
   * - getByTestId() - Find by data-testid attribute
   * 
   * We prefer getByRole() because it's accessibility-first and resilient
   * to UI changes.
   */
  test('should find elements on the page', async ({ page }) => {
    await page.goto('/');
    
    // Example: Find a button by its accessible role and name
    // This will find: <button>Login</button>
    // Or: <button aria-label="Login">Sign In</button>
    const loginButton = page.getByRole('button', { name: /login/i });
    
    // Verify the button exists and is visible
    await expect(loginButton).toBeVisible();
    
    // LEARNING NOTE: We don't click the button yet because we haven't
    // set up test users. We'll do that in the next step!
  });

  /**
   * This test demonstrates waiting for elements.
   * 
   * LEARNING NOTE: Modern web apps load content dynamically. Playwright
   * automatically waits for elements to appear, but you can be explicit
   * about what you're waiting for.
   */
  test('should wait for dynamic content', async ({ page }) => {
    await page.goto('/');
    
    // Playwright automatically waits up to 30 seconds for this element
    // to appear. If it doesn't appear, the test fails.
    await expect(page.getByRole('main')).toBeVisible();
    
    // LEARNING NOTE: You rarely need to use page.waitForTimeout().
    // Playwright's built-in waiting is smarter and more reliable.
  });
});

/**
 * NEXT STEPS:
 * 
 * Now that you understand the basic structure, we'll:
 * 1. Create test user credentials
 * 2. Write a real test that logs in as a host
 * 3. Create a game and verify the dashboard appears
 * 
 * This example file will be deleted once we have real tests.
 */

