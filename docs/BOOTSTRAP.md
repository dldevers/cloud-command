# CloudCommand Bootstrap

CloudCommand bootstrap is the process that turns a prepared machine or Kubernetes environment into a usable CloudCommand control plane.

The bootstrap process should be safe to rerun. Each step verifies current state before acting, repairs missing required state when possible, and avoids overwriting intentional existing state.

## Bootstrap Goals

Bootstrap should prepare the minimum required system state for CloudCommand to run:

1. Verify the host or Kubernetes environment is reachable.
2. Verify required dependencies are available.
3. Initialize the CloudCommand control plane database.
4. Run required database migrations.
5. Create the first admin user if no admin user exists.
6. Verify the control plane can start.
7. Print the next login URL for the user.

Bootstrap should not assume the environment is empty. It should inspect what already exists and continue safely.

## First Admin User

During bootstrap, CloudCommand checks whether the control plane database has an existing admin user.

If no admin user exists, bootstrap prompts for a first admin account and stores the password using a secure password hash.

Bootstrap will not overwrite, recreate, or reset admin users on later runs.

This keeps bootstrap safe to rerun while still allowing a new CloudCommand installation to become usable without a separate manual database step.

## Expected Behavior

When `cloud-command bootstrap` runs, it should:

1. Verify that the control plane database exists.
2. Run any required schema migrations.
3. Check whether an admin user already exists.
4. If no admin user exists, prompt for first admin account creation.
5. If an admin user already exists, skip admin creation.

Example first-run flow:

```text
No admin user found.

Create first CloudCommand admin user.

Email: dave@example.com
Password:
Confirm password:

Admin user created.
You can now log in to the CloudCommand control plane.
