# Contributing to MiniVAgent

MiniVAgent is maintained by a small core team and welcomes contributions from the wider community. No contribution is too small — bug fixes, documentation improvements, new features, and tests are all appreciated.

If the contribution you're submitting is **not original work**, you have to indicate the name of the license and make sure it is compatible with Apache 2.0. The Apache Software Foundation maintains a list of compatible licenses under Category A. You may also be required to make proper attributions.

Finally, keep in mind that it is **never** a good idea to remove licensing headers from work that is not your own. Even if you are using only parts of a file that originally had a licensing header, err on the side of preserving it. If you are unsure about the licensing implications of your contribution, feel free to open an issue and ask.

Your chances of getting feedback and seeing your code merged greatly depend on how granular your changes are. If you have a bigger change in mind, we highly recommend opening an issue first to discuss your proposal before spending a lot of time writing code. Even once a proposal is validated, we recommend doing the work as a series of small, self-contained commits — this makes the reviewer's job much easier and increases the timeliness of feedback.

## Getting Started

1. **Fork** this repository and clone your fork locally.
2. **Install dependencies**: `npm install`
3. **Create a branch** for your change: `git checkout -b my-feature`
4. Make your changes, then **run the tests** to make sure nothing is broken:
    ```bash
    npm test
    ```
5. **Commit** your changes with a clear, descriptive message.
6. **Push** your branch and open a **Pull Request** against `main`.

## Submitting Changes

- One concern per pull request whenever possible.
- Describe *what* the change does and *why* in the PR description.
- If your PR fixes an existing issue, reference it: `Fixes #123`.

## Code Review

Pull requests are reviewed by the core team and community members. Expect feedback within a few days. Please be patient, and don't hesitate to add a comment if you haven't heard back after a week.

A PR is ready to merge when it has at least one approval and no outstanding objections.

## Licensing

If the contribution you're submitting is **original work**, you can assume that MiniVAgent will release it as part of an overall release available to downstream consumers under the [Apache License, Version 2.0](LICENSE).


