# Clean GitHub runner startup correction

The [first GitHub Verify run](https://github.com/dattk2002/oath-front-tcg/actions/runs/39525499520) for `e47b33f` passed frozen installation, static checks, **618 tests across73 files**, migration/restore and production build. Browser integration then exited before any test because its fixture command could not start. [Original step log](first-run-browser-failure.log) and [run metadata](first-run.json) are retained. The log alone did not identify the missing executable.

The [investigation](implementation-report.md) reproduced the cause in a fresh isolated dependency tree: the lock contained transitive `tsx`, but neither root nor API declared the tool used by browser/load/simulation commands. The development checkout retained a binary that a clean frozen install did not create.

Commit `5cc848d` adds only the root development declaration of the already locked **tsx4.23.15**, plus its lock importer entry (four lines). No version/resolution, game runtime or production dependency changed. A second fresh frozen install made root/API commands available; one browser smoke using that clean dependency tree and unchanged production artifacts passed guest→mulligan→unit→pass/reload with no unexpected console errors. [Independent review](review.md) approved spec compliance and quality without findings.

`captures/` retains actual RED/GREEN install/bin logs, primary package metadata, reproduction scripts, browser screenshots/network data and their original hash manifest. No full local suite or build was repeated. The successful local smoke is **not** a claim that remote CI passed; the [Verify workflow runs](https://github.com/dattk2002/oath-front-tcg/actions/workflows/ci.yml) provide the authoritative result for each pushed commit.

Earlier [final technical review](../final-review/README.md), runtime artifact identities and [product release holds](../../release-checklist.md) remain valid within their stated scope.
