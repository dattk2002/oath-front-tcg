# Pre-T14 persisted SKIRMISH fixture

Generated independently from commit `f2dbfac73f6698725781f9ab55649964cad348b8` using `git archive` into ignored scratch space. The archived engine, content, contracts, checkpoint encoder and journal recorder were bundled with esbuild. Explicit `@oathfront/game-engine`, `@oathfront/game-content` and `@oathfront/contracts` aliases pointed to archived source; a metafile check rejected every workspace input outside that archive. Only installed third-party dependencies were reused; no workspace node_modules symlinks were used.

Fixed public test seed: bytes0–31 from that commit's `tests/fixtures/match-fixture.ts`; no user data or runtime credentials. The path is GOOD empty mulligan → BOT EVIL empty mulligan → BOT EVIL pass deployment → HUMAN pause, at turn1 GOOD_PLAY. The fixture retains immutable initialization, paused checkpoint,4 journal entries and27 events. A baseline RESUME computes the expected resumed hash separately without modifying the retained checkpoint.

- Initial hash: `a968d4ae5f6afe5b3e386589f9bb7e7c059c443acb0a2a3bf5d0296451df55ad`
- Paused hash: `5ede397fb173a44b4cb3fe243f3a847e1848a6a25e6f50043255ad1e3630892a`
- Resumed hash: `4b5508561b15aefdef340737e54e8c322e5c793f46ab5c3ec2e98af0acdaed1d`
- JSON SHA256: `fa96c1d1f8d5e15182319a279548fa908737eb9342042551567bb3f408c0aaa1`

The test imports these records into the isolated verification database without calling current createMatch. Current replay verifies original initialization/event history, the API reads and resumes revision4→5, replay then verifies the baseline resumed hash, and original initialization stays unchanged. Do not regenerate expectations with current code.

Generation commands: `git archive f2dbfac73f6698725781f9ab55649964cad348b8 | tar -x -C <ignored-baseline-dir>`, then `node <ignored-baseline-dir>/bundle.mjs` and `node <ignored-baseline-dir>/generate.cjs`. Exact generator/bundler source and the archived input hash manifest are retained with Task14 review evidence as `fix1-baseline-generate.ts.txt`, `fix1-baseline-bundle.mjs.txt`, and `fix1-baseline-provenance.json`. This JSON is a historical test artifact, not a second engine implementation.
