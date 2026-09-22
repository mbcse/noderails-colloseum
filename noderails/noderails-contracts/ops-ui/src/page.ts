export function pageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NodeRails Foundry ops</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&amp;display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
  <style>
    :root {
      --md-sys-color-primary: #1b5e20;
      --md-sys-color-on-primary: #ffffff;
      --md-sys-color-primary-container: #c8e6c9;
      --md-sys-color-surface: #f7f9f7;
      --md-sys-color-surface-container: #ffffff;
      --md-sys-color-surface-low: #eef3ee;
      --md-sys-color-outline: #c5cdc6;
      --md-sys-color-outline-variant: #e1e6e1;
      --md-sys-color-on-surface: #1a1c1a;
      --md-sys-color-on-surface-variant: #5c635d;
      --md-sys-color-error: #b3261e;
      --md-sys-color-error-container: #f9dedc;
      --md-sys-color-tertiary: #1565c0;
      --shadow: 0 1px 2px rgba(26, 28, 26, .06), 0 4px 12px rgba(26, 28, 26, .06);
      --radius: 16px;
      --sidebar: 256px;
      --log-rail: 400px;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      font-family: Roboto, system-ui, sans-serif;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
    }
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-size: 22px;
      vertical-align: middle;
    }
    .app { display: flex; height: 100%; min-height: 0; }
    .app > aside {
      width: var(--sidebar);
      flex-shrink: 0;
      background: var(--md-sys-color-surface-container);
      border-right: 1px solid var(--md-sys-color-outline-variant);
      display: flex;
      flex-direction: column;
      padding: 20px 12px;
      height: 100%;
    }
    .brand {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 8px 12px 20px;
    }
    .brand-mark {
      width: 40px; height: 40px; border-radius: 12px;
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      display: grid; place-items: center;
    }
    .brand h1 { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: .01em; }
    .brand p { margin: 2px 0 0; font-size: 12px; color: var(--md-sys-color-on-surface-variant); }
    nav { display: flex; flex-direction: column; gap: 4px; }
    nav button {
      display: flex; align-items: center; gap: 12px;
      width: 100%; text-align: left;
      border: 0; background: transparent;
      color: var(--md-sys-color-on-surface-variant);
      border-radius: 28px;
      padding: 10px 16px;
      font: 500 14px/1.2 Roboto, sans-serif;
      cursor: pointer;
    }
    nav button:hover { background: var(--md-sys-color-surface-low); }
    nav button.active {
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-primary);
    }
    nav button.active .material-symbols-outlined { font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24; }
    .aside-foot {
      margin-top: auto;
      padding: 12px;
      font-size: 11px;
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.4;
    }
    .shell { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
    .topbar {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      padding: 16px 28px;
      background: var(--md-sys-color-surface-container);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      flex-shrink: 0;
      z-index: 4;
    }
    .topbar h2 { margin: 0; font-size: 22px; font-weight: 500; flex: 1; min-width: 160px; }
    .field { display: flex; flex-direction: column; gap: 6px; min-width: 180px; }
    .field label { font-size: 12px; font-weight: 500; color: var(--md-sys-color-on-surface-variant); }
    input, select, textarea {
      font: 14px/1.4 Roboto, sans-serif;
      color: var(--md-sys-color-on-surface);
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: 8px;
      padding: 10px 12px;
      width: 100%;
    }
    textarea { min-height: 64px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    input:focus, select:focus, textarea:focus {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 0;
      border-color: var(--md-sys-color-primary);
    }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      border: 0; cursor: pointer;
      font: 500 14px/1 Roboto, sans-serif;
      border-radius: 20px;
      padding: 10px 20px;
      background: var(--md-sys-color-surface-low);
      color: var(--md-sys-color-primary);
    }
    .btn:hover { filter: brightness(0.97); }
    .btn.primary { background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
    .btn.danger { background: var(--md-sys-color-error); color: #fff; }
    .btn:disabled { opacity: .38; cursor: not-allowed; }
    .icon-btn {
      width: 40px; height: 40px; padding: 0; border-radius: 20px;
      border: 1px solid var(--md-sys-color-outline);
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface-variant);
      cursor: pointer;
      display: grid; place-items: center;
    }
    .work { flex: 1; min-height: 0; display: flex; }
    main { flex: 1; min-width: 0; padding: 24px 28px 48px; overflow: auto; }
    .panel { display: none; }
    .panel.active { display: block; }
    .log-rail {
      width: var(--log-rail);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: #151715;
      border-left: 1px solid #2a2e2a;
      color: #e8eaed;
    }
    .log-head {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 14px;
      border-bottom: 1px solid #2a2e2a;
      flex-shrink: 0;
    }
    .log-head h3 { margin: 0; font-size: 13px; font-weight: 600; flex: 1; color: #e8eaed; }
    .log-head .busy { color: #a8c5a8; font-size: 11px; }
    .log-head .icon-btn {
      width: 32px; height: 32px; border-radius: 16px;
      border-color: #3a403a; background: #1c1f1c; color: #c5cdc6;
    }
    .shell.log-collapsed .log-rail { width: 44px; }
    .shell.log-collapsed .log-head { flex-direction: column; padding: 12px 6px; gap: 10px; }
    .shell.log-collapsed .log-head h3,
    .shell.log-collapsed .log-head .busy,
    .shell.log-collapsed #clearLog { display: none; }
    .shell.log-collapsed #log { display: none; }
    .log-toggle-label { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 12px; font-weight: 600; letter-spacing: .04em; }
    .shell:not(.log-collapsed) .log-toggle-label { display: none; }
    .card {
      background: var(--md-sys-color-surface-container);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 20px 22px;
      margin-bottom: 16px;
    }
    .card h3 { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
    .lede { margin: 0 0 16px; color: var(--md-sys-color-on-surface-variant); font-size: 13px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .env-lists { display: flex; flex-direction: column; gap: 16px; margin-bottom: 18px; }
    .env-list {
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 12px;
      padding: 14px 16px;
      background: var(--md-sys-color-surface);
    }
    .env-list-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .env-list-head h4 { margin: 0; font-size: 14px; font-weight: 600; }
    .env-list-key { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--md-sys-color-on-surface-variant); }
    .env-list-hint { margin: 6px 0 12px; font-size: 12px; line-height: 1.45; color: var(--md-sys-color-on-surface-variant); }
    .env-list-rows { display: flex; flex-direction: column; gap: 8px; }
    .env-list-row { display: flex; align-items: center; gap: 8px; }
    .env-list-row .slot { flex: 0 0 72px; font-size: 11px; font-weight: 500; color: var(--md-sys-color-on-surface-variant); }
    .env-list-row input { flex: 1; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .env-list-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .env-list-status { font-size: 12px; font-weight: 500; color: var(--md-sys-color-on-surface-variant); }
    .env-list-status.ok { color: var(--md-sys-color-primary); }
    .env-list-status.warn { color: var(--md-sys-color-error); }
    #topbarChain[hidden] { display: none !important; }
    @media (max-width: 900px) {
      .app > aside { display: none; }
      .grid-2 { grid-template-columns: 1fr; }
      .log-rail { width: min(var(--log-rail), 42vw); }
    }
    @media (max-width: 760px) {
      .work { flex-direction: column; }
      .log-rail { width: 100%; height: 36vh; border-left: 0; border-top: 1px solid #2a2e2a; }
      .shell.log-collapsed .log-rail { width: 100%; height: 44px; }
      .shell.log-collapsed .log-head { flex-direction: row; }
      .log-toggle-label { writing-mode: horizontal-tb; transform: none; }
    }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid var(--md-sys-color-outline-variant); vertical-align: top; font-size: 13px; }
    th { color: var(--md-sys-color-on-surface-variant); font-weight: 500; font-size: 12px; }
    tr:last-child td { border-bottom: 0; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
    a { color: var(--md-sys-color-tertiary); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .pill {
      display: inline-flex; align-items: center;
      padding: 2px 10px; border-radius: 8px; font-size: 11px; font-weight: 500;
      background: var(--md-sys-color-surface-low); color: var(--md-sys-color-on-surface-variant);
      margin: 0 4px 4px 0;
    }
    .pill.warn { background: var(--md-sys-color-error-container); color: var(--md-sys-color-error); }
    .pill.ok { background: var(--md-sys-color-primary-container); color: var(--md-sys-color-primary); }
    .secret-wrap { display: flex; gap: 8px; align-items: center; }
    .secret-wrap input { flex: 1; }
    .err {
      background: var(--md-sys-color-error-container); color: var(--md-sys-color-error);
      padding: 12px 16px; border-radius: 12px; margin-bottom: 16px;
    }
    #log {
      flex: 1; min-height: 0; overflow: auto; white-space: pre-wrap;
      background: transparent; color: #d7dbd7; padding: 12px 14px; margin: 0;
      font-family: ui-monospace, Menlo, monospace; font-size: 12px; line-height: 1.45;
    }
    #log:empty::before { content: 'Forge output stays here while you deploy.'; color: #8a918a; }
    .fn { padding: 16px 0; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
    .fn:last-child { border-bottom: 0; }
    .fn h3 { margin: 0 0 8px; font-size: 15px; }
    .meta { color: var(--md-sys-color-on-surface-variant); font-size: 12px; margin-bottom: 10px; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: end; }
    .row > .field { flex: 1; }
    .quote-box {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 12px;
      background: var(--md-sys-color-surface-low);
      border: 1px solid var(--md-sys-color-outline-variant);
    }
    .quote-max { margin: 0 0 6px; font-size: 20px; font-weight: 600; }
    .quote-box .seg { margin: 10px 0 12px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .contracts { margin: 0 0 12px; font-size: 13px; }
    .seg {
      display: flex; gap: 4px; margin-bottom: 12px; width: fit-content;
      background: var(--md-sys-color-surface-low); border-radius: 20px; padding: 4px;
    }
    .seg button {
      border: 0; background: transparent; padding: 8px 16px; border-radius: 16px;
      cursor: pointer; font: 500 13px Roboto, sans-serif;
      color: var(--md-sys-color-on-surface-variant);
    }
    .seg button.active {
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-primary);
      box-shadow: var(--shadow);
    }
    .chain-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
      gap: 10px;
    }
    .chain-card {
      text-align: left; font: inherit; color: inherit; cursor: pointer;
      border: 1px solid var(--md-sys-color-outline-variant);
      background: var(--md-sys-color-surface);
      border-radius: 12px; padding: 14px 16px;
    }
    .chain-card:hover { border-color: var(--md-sys-color-primary); }
    .chain-card.selected {
      border-color: var(--md-sys-color-primary);
      background: var(--md-sys-color-primary-container);
    }
    .chain-card strong { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .chain-card .meta { font-size: 12px; color: var(--md-sys-color-on-surface-variant); line-height: 1.45; }
    .chainlist-results {
      max-height: 280px; overflow: auto; border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 12px; margin-top: 10px;
    }
    .chainlist-row {
      display: flex; justify-content: space-between; gap: 12px; width: 100%;
      text-align: left; font: inherit; color: inherit; cursor: pointer;
      border: 0; border-bottom: 1px solid var(--md-sys-color-outline-variant);
      background: transparent; padding: 10px 12px;
    }
    .chainlist-row:last-child { border-bottom: 0; }
    .chainlist-row:hover, .chainlist-row.selected { background: var(--md-sys-color-primary-container); }
    .chainlist-row strong { display: block; font-size: 13px; }
    .chainlist-row .meta { font-size: 12px; color: var(--md-sys-color-on-surface-variant); }
    .saved-strip { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .saved-chip {
      border: 1px solid var(--md-sys-color-outline-variant); background: var(--md-sys-color-surface);
      border-radius: 999px; padding: 6px 10px; font: 500 12px Roboto, sans-serif; cursor: pointer;
    }
    .saved-chip:hover, .saved-chip.active { border-color: var(--md-sys-color-primary); color: var(--md-sys-color-primary); }
    .chain-hero { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: baseline; }
    .chain-hero h3 { margin: 0; font-size: 20px; font-weight: 600; }
    .busy { font-size: 13px; color: var(--md-sys-color-on-surface-variant); }
    .contract-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 900px) { .contract-grid { grid-template-columns: 1fr; } }
    .contract-card {
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 12px; padding: 16px; background: var(--md-sys-color-surface);
    }
    .contract-card .label { font-size: 12px; font-weight: 500; color: var(--md-sys-color-on-surface-variant); margin-bottom: 8px; }
    .kv { display: grid; grid-template-columns: 150px 1fr; gap: 10px 16px; align-items: center; margin: 0 0 16px; font-size: 13px; }
    .kv dt { color: var(--md-sys-color-on-surface-variant); }
    .kv dd { margin: 0; }
    .empty { color: var(--md-sys-color-on-surface-variant); font-size: 13px; margin: 0; }
    .table-wrap { overflow-x: auto; }
    .addr-cell { display: flex; align-items: center; gap: 6px; min-width: 140px; white-space: nowrap; }
    .addr-cell .mono { flex: 1; min-width: 0; }
    .addr-cell .icon-btn { width: 32px; height: 32px; flex-shrink: 0; }
    .addr-cell .icon-btn.copied { color: var(--md-sys-color-primary); border-color: var(--md-sys-color-primary); }
    .chain-open {
      border: 0; background: none; padding: 0; cursor: pointer;
      font: 600 13px Roboto, sans-serif; color: inherit; text-align: left;
    }
    .chain-open:hover { color: var(--md-sys-color-primary); }
  </style>
</head>
<body>
  <div class="app">
    <aside>
      <div class="brand">
        <div class="brand-mark"><span class="material-symbols-outlined">deployed_code</span></div>
        <div>
          <h1>Foundry ops</h1>
          <p>NodeRails · local</p>
        </div>
      </div>
      <nav>
        <button type="button" class="active" data-tab="overview"><span class="material-symbols-outlined">hub</span>Chain</button>
        <button type="button" data-tab="contracts"><span class="material-symbols-outlined">table</span>Contracts</button>
        <button type="button" data-tab="env"><span class="material-symbols-outlined">key</span>Environment</button>
        <button type="button" data-tab="roles"><span class="material-symbols-outlined">admin_panel_settings</span>Who can call</button>
        <button type="button" data-tab="interact"><span class="material-symbols-outlined">touch_app</span>Interact</button>
      </nav>
      <div class="aside-foot">127.0.0.1 only. Keys stay in noderails-contracts/.env and are signed by Foundry, not a browser wallet.</div>
    </aside>
    <div class="shell">
      <div class="topbar">
        <h2 id="pageTitle">Chain</h2>
        <div class="field" id="topbarChain" style="min-width:240px;">
          <label for="chain">Chain</label>
          <select id="chain"></select>
        </div>
        <button type="button" class="btn" id="refresh"><span class="material-symbols-outlined">refresh</span>Refresh</button>
      </div>
      <div class="work">
      <main>
        <p id="banner" class="err" hidden></p>

        <div class="panel active" data-panel="overview">
          <div class="card">
            <h3>Select chain</h3>
            <p class="lede">Search <span class="mono">chainlist.org/rpcs.json</span>, pick an RPC, or enter chainId + RPC manually. Saved / curated networks stay as quick chips.</p>
            <p class="lede" style="margin-bottom:6px">Saved</p>
            <div class="saved-strip" id="savedChains"></div>
            <div class="field" style="margin-top:14px">
              <label for="chainlistSearch">Search chainlist</label>
              <input id="chainlistSearch" placeholder="Name, shortName, or chainId" autocomplete="off" />
            </div>
            <div class="chainlist-results" id="chainlistResults"></div>
            <div class="row" style="margin-top:12px">
              <div class="field">
                <label for="chainlistRpc">RPC for selected chain</label>
                <select id="chainlistRpc"></select>
              </div>
              <button type="button" class="btn primary" id="useChainlistNetwork"><span class="material-symbols-outlined">lan</span>Use this network</button>
            </div>
            <hr style="border:0;border-top:1px solid var(--md-sys-color-outline-variant);margin:18px 0" />
            <p class="lede">Manual RPC</p>
            <div class="row">
              <div class="field">
                <label for="manualChainId">Chain ID</label>
                <input id="manualChainId" placeholder="137" inputmode="numeric" />
              </div>
              <div class="field" style="flex:1">
                <label for="manualRpcUrl">RPC URL (https)</label>
                <input id="manualRpcUrl" placeholder="https://…" spellcheck="false" />
              </div>
              <div class="field">
                <label for="manualChainName">Name (optional)</label>
                <input id="manualChainName" placeholder="polygon" />
              </div>
              <button type="button" class="btn" id="useManualNetwork"><span class="material-symbols-outlined">link</span>Use</button>
            </div>
            <p class="lede" id="chainPickStatus" style="margin-top:10px"></p>
          </div>
          <div class="card">
            <div class="chain-hero">
              <div>
                <h3 id="chainHeroName">—</h3>
                <p class="lede" id="chainHeroMeta" style="margin-bottom:0"></p>
              </div>
              <p class="busy" id="chainBusy" hidden>Loading on-chain state…</p>
            </div>
          </div>
          <div class="card">
            <h3>Current contracts</h3>
            <p class="lede">Live addresses from <span class="mono">deployData/contractAddresses.json</span>.</p>
            <div class="contract-grid" id="currentContracts"></div>
          </div>
          <div class="card">
            <h3>Past deploys</h3>
            <p class="lede">Replaced and previous addresses from <span class="mono">deployData/deploymentHistory.json</span> for this chain.</p>
            <div id="history"></div>
          </div>
          <div class="card">
            <h3>Account balances</h3>
            <p class="lede">Native balance plus Escrow / MerchantManager <span class="mono">getKeyRole</span> for addresses in .env.</p>
            <div id="balances"></div>
          </div>
          <div class="card">
            <h3>Deploy on this chain</h3>
            <p class="lede">Runs <span class="mono">script/deploy.sh</span> with the deployer key. Deploy first estimates gas, you pick a fee lock (Minimum by default), then Confirm sends at that lock. The send will not raise the fee after you confirm.</p>
            <div class="row">
              <div class="field">
                <label for="deployTarget">Target</label>
                <select id="deployTarget">
                  <option value="all">Escrow + MerchantManager</option>
                  <option value="escrow">Escrow only</option>
                  <option value="merchant-manager">MerchantManager only</option>
                </select>
              </div>
              <button type="button" class="btn primary" id="runDeploy"><span class="material-symbols-outlined">calculate</span>Estimate fee</button>
            </div>
            <div id="deployQuote" class="quote-box" hidden>
              <p class="lede" id="deployQuoteStatus">Estimating gas and network fee.</p>
              <div id="deployQuoteBody" hidden>
                <p class="quote-max" id="deployQuoteMax"></p>
                <p class="lede" id="deployQuoteMeta"></p>
                <div class="seg" id="deployBumps"></div>
                <p class="lede">If the next blocks are cheaper, you pay less. Confirm will not use a higher fee than this lock. Quote lasts 90 seconds.</p>
                <div class="row">
                  <button type="button" class="btn" id="deployQuoteCancel">Cancel</button>
                  <button type="button" class="btn primary" id="deployQuoteConfirm"><span class="material-symbols-outlined">rocket_launch</span>Confirm deploy</button>
                </div>
              </div>
            </div>
            <div class="field" id="deployTempoFeeWrap" style="margin-top:14px;display:none">
              <label for="deployTempoFeeToken">Tempo fee token (TIP-20)</label>
              <input id="deployTempoFeeToken" placeholder="0x20c0… pathUSD on deployer" spellcheck="false" autocomplete="off" />
              <p class="lede" style="margin-top:6px">Tempo has no native gas. Deploy requires Foundry with <span class="mono">--tempo.fee-token</span> (<span class="mono">foundryup</span> in your shell). Fund the deployer with this TIP-20 before broadcast (pathUSD on Moderato).</p>
            </div>
            <div class="field" style="margin-top:14px">
              <label for="deploySwapRouters">Swap routers (comma-separated, this chain)</label>
              <textarea id="deploySwapRouters" placeholder="0x…, 0x…" spellcheck="false"></textarea>
            </div>
            <div class="field" style="margin-top:12px">
              <label for="deployBridgeRouters">Bridge routers (comma-separated, this chain)</label>
              <textarea id="deployBridgeRouters" placeholder="0x…, 0x…" spellcheck="false"></textarea>
            </div>
            <div class="field" style="margin-top:12px">
              <label for="deploySettlementTokens">Settlement tokens (comma-separated, this chain)</label>
              <textarea id="deploySettlementTokens" placeholder="0x…, 0x…" spellcheck="false"></textarea>
            </div>
          </div>
          <div class="card">
            <h3>War Room registration</h3>
            <p class="lede">Puts local Escrow / MerchantManager from <span class="mono">contractAddresses.json</span> into NodeRails War Room via <span class="mono">script/register-war-room.sh</span>. Deploy already tries this automatically; use this if that step was skipped or failed. Needs <span class="mono">WAR_ROOM_URL</span> and <span class="mono">WAR_ROOM_DEPLOY_API_KEY</span> in Env.</p>
            <p class="lede" id="warRoomStatus">Checking…</p>
            <div class="row">
              <div class="field">
                <label for="warRoomTarget">Broadcast script (for tx hash)</label>
                <select id="warRoomTarget">
                  <option value="all">DeployAll</option>
                  <option value="escrow">DeployEscrow</option>
                  <option value="merchant-manager">DeployMerchantManager</option>
                </select>
              </div>
              <button type="button" class="btn primary" id="runWarRoomRegister"><span class="material-symbols-outlined">cloud_upload</span>Register with War Room</button>
            </div>
          </div>
          <div class="card">
            <h3>Roles</h3>
            <p class="lede">Runs <span class="mono">script/roles.sh</span> for this chain.</p>
            <div class="row">
              <div class="field">
                <label for="rolesCmd">Command</label>
                <select id="rolesCmd">
                  <option value="setup">setup</option>
                  <option value="add-tx-keys">add-tx-keys</option>
                  <option value="add-admins">add-admins</option>
                  <option value="remove-keys">remove-keys</option>
                </select>
              </div>
              <button type="button" class="btn" id="runRoles"><span class="material-symbols-outlined">group</span>Run roles</button>
            </div>
          </div>
          <div class="card">
            <h3>Escrow settings</h3>
            <p class="lede">Values read live from the current escrow. Candidate rows are the last Deploy-card lists for this chain. Settlement tokens: Admin key. Routers: War Room 3-of-5.</p>
            <div id="settingsEscrow"></div>
          </div>
          <div class="card">
            <h3>MerchantManager settings</h3>
            <p class="lede">Live pause / fee recipient on the current MerchantManager.</p>
            <div id="settingsMm"></div>
          </div>
        </div>

        <div class="panel" data-panel="contracts">
          <div class="card">
            <h3>War Room registration</h3>
            <p class="lede">Selected chain from the Chain tab. Puts local Escrow / MerchantManager into NodeRails War Room. Needs <span class="mono">WAR_ROOM_URL</span> and <span class="mono">WAR_ROOM_DEPLOY_API_KEY</span> in Env. Per-row Register in the table below works for any chain.</p>
            <p class="lede" id="warRoomStatusContracts">Checking…</p>
            <div class="row">
              <div class="field">
                <label for="warRoomTargetContracts">Broadcast script (for tx hash)</label>
                <select id="warRoomTargetContracts">
                  <option value="all">DeployAll</option>
                  <option value="escrow">DeployEscrow</option>
                  <option value="merchant-manager">DeployMerchantManager</option>
                </select>
              </div>
              <button type="button" class="btn primary" id="runWarRoomRegisterContracts"><span class="material-symbols-outlined">cloud_upload</span>Register with War Room</button>
            </div>
          </div>
          <div class="card">
            <h3>Current contracts</h3>
            <p class="lede">Only chains with Escrow and/or Merchant Manager in <span class="mono">deployData/contractAddresses.json</span>. Names come from <span class="mono">chains.json</span> / <span class="mono">customChains.json</span>. Copy address or ABI, register with War Room, or open the chain workspace.</p>
            <div class="seg" id="addrNet">
              <button type="button" class="active" data-addr-net="deployed">Deployed</button>
              <button type="button" data-addr-net="testnets">Testnets</button>
              <button type="button" data-addr-net="mainnets">Mainnets</button>
              <button type="button" data-addr-net="all">All</button>
            </div>
            <div class="table-wrap" id="addressBook"></div>
          </div>
        </div>

        <div class="panel" data-panel="env">
          <div class="card">
            <h3>Environment</h3>
            <p class="lede">Reads and writes <span class="mono">noderails-contracts/.env</span>. Address lists use one box per address and are saved comma-separated. Private keys are masked until you reveal them.</p>
            <div id="envLists" class="env-lists"></div>
            <div class="grid-2" id="env"></div>
            <div class="actions">
              <button type="button" class="btn primary" id="saveEnv"><span class="material-symbols-outlined">save</span>Save .env</button>
            </div>
          </div>
        </div>

        <div class="panel" data-panel="roles">
          <div class="card">
            <h3>Escrow</h3>
            <p class="lede">Admin includes SuperAdmin. Capture and settle stay out of this UI.</p>
            <div id="matrixEscrow"></div>
          </div>
          <div class="card">
            <h3>MerchantManager</h3>
            <p class="lede">Pause here is Admin; on Escrow, pause is SuperAdmin.</p>
            <div id="matrixMm"></div>
          </div>
        </div>

        <div class="panel" data-panel="interact">
          <div class="card">
            <h3>Interact</h3>
            <p class="lede" id="interactHint">Deploy a contract on this chain to enable calls.</p>
            <div id="interact"></div>
          </div>
        </div>

      </main>
      <div class="log-rail" aria-label="Command log">
        <div class="log-head">
          <span class="log-toggle-label">Log</span>
          <h3>Command log</h3>
          <span class="busy" id="logBusy" hidden>Running…</span>
          <button type="button" class="icon-btn" id="clearLog" title="Clear log"><span class="material-symbols-outlined">delete</span></button>
          <button type="button" class="icon-btn" id="toggleLog" title="Collapse log"><span class="material-symbols-outlined">dock_to_left</span></button>
        </div>
        <pre id="log"></pre>
      </div>
      </div>
    </div>
  </div>
  <script>
${clientJs()}
  </script>
</body>
</html>`;
}

function clientJs(): string {
  return `const $ = (id) => document.getElementById(id);
const TITLES = {
  overview: 'Chain',
  contracts: 'Contracts',
  env: 'Environment',
  roles: 'Who can call',
  interact: 'Interact',
};
const logEl = $('log');
const shellEl = document.querySelector('.shell');
let catalog = { functions: [], matrix: { escrow: [], merchantManager: [] } };
let state = null;
let envValues = {};
let revealed = {};
let netFilter = 'testnets';
let addrNet = 'deployed';
let addressRows = [];
let chainBusy = false;
let chainlistItems = [];
let chainlistQuery = '';
let selectedChainlistId = null;
let sessionRpcUrl = '';
let sessionChainMeta = null;

function setTab(id) {
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === id));
  $('pageTitle').textContent = TITLES[id] || id;
  const chainField = $('topbarChain');
  if (chainField) chainField.hidden = id === 'contracts';
}

document.querySelectorAll('nav button').forEach((b) => {
  b.addEventListener('click', () => setTab(b.dataset.tab));
});

function openLog() {
  shellEl.classList.remove('log-collapsed');
  $('toggleLog').title = 'Collapse log';
}

function appendLog(line) {
  logEl.textContent += line + '\\n';
  logEl.scrollTop = logEl.scrollHeight;
}

function setLogRunning(on) {
  $('logBusy').hidden = !on;
  if (on) openLog();
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function selectedChainId() {
  return $('chain').value;
}

function sessionFields() {
  const chain = selectedChain() || sessionChainMeta;
  const out = {
    chainId: selectedChainId() || (chain && String(chain.chainId)) || '',
  };
  if (sessionRpcUrl) out.rpcUrl = sessionRpcUrl;
  if (chain?.name || sessionChainMeta?.name) out.chainName = chain?.name || sessionChainMeta?.name;
  if (chain?.explorerUrl || sessionChainMeta?.explorerUrl) {
    out.explorerUrl = chain?.explorerUrl || sessionChainMeta?.explorerUrl;
  }
  if (chain?.nativeCurrency || sessionChainMeta?.nativeCurrency) {
    out.nativeCurrency = chain?.nativeCurrency || sessionChainMeta?.nativeCurrency;
  }
  if (chain?.networkType || sessionChainMeta?.networkType) {
    out.networkType = chain?.networkType || sessionChainMeta?.networkType;
  }
  return out;
}

function stateQuery(chainId) {
  const id = chainId != null ? String(chainId) : (selectedChainId() || '');
  const qs = new URLSearchParams({ chainId: id });
  if (sessionRpcUrl) qs.set('rpcUrl', sessionRpcUrl);
  const meta = sessionChainMeta && String(sessionChainMeta.chainId) === id ? sessionChainMeta : null;
  if (meta?.name) qs.set('chainName', meta.name);
  if (meta?.explorerUrl) qs.set('explorerUrl', meta.explorerUrl);
  if (meta?.nativeCurrency) qs.set('nativeCurrency', meta.nativeCurrency);
  if (meta?.networkType) qs.set('networkType', meta.networkType);
  return qs;
}

function selectedChain() {
  const id = selectedChainId();
  // Prefer session meta so chainlist isTestnet / name survive state reloads
  if (sessionChainMeta && String(sessionChainMeta.chainId) === id) {
    const fromState = (state?.chains || []).find((c) => String(c.chainId) === id)
      || (state?.chain && String(state.chain.chainId) === id ? state.chain : null);
    return { ...(fromState || {}), ...sessionChainMeta, chainId: Number(id) };
  }
  return (state?.chains || []).find((c) => String(c.chainId) === id)
    || (state?.chain && String(state.chain.chainId) === id ? state.chain : null);
}

function confirmRun(danger, chainIdOverride) {
  const id = chainIdOverride != null ? String(chainIdOverride) : selectedChainId();
  const chain = chainIdOverride != null
    ? (sessionChainMeta && String(sessionChainMeta.chainId) === id
      ? { ...sessionChainMeta }
      : (state?.chains || []).find((c) => String(c.chainId) === id)
        || (state?.chain && String(state.chain.chainId) === id ? state.chain : null))
    : selectedChain();
  const extra = {};
  if (chain?.networkType === 'mainnets') {
    const typed = prompt('Mainnet. Type the chain name exactly: ' + chain.name);
    extra.confirmName = typed || '';
  }
  if (danger) extra.confirmDanger = confirm('Dangerous call (full stop / emergency withdraw). Continue?');
  return extra;
}

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const ADDRESS_LISTS = {
  SUPER_ADMIN_ADDRESSES: {
    title: 'SuperAdmin signers',
    hint: 'Exactly 5 distinct EOAs. They are constructor signers, not KeyRole.SuperAdmin. Cannot also be Admin or TX keys.',
    min: 5,
    max: 5,
    addLabel: 'Add signer',
  },
  ADMIN_ADDRESSES: {
    title: 'Admin addresses',
    hint: 'At least 1. Assigned KeyRole.Admin in the constructor. Can pause / full-stop, revoke TX keys, and add settlement tokens.',
    min: 1,
    max: 0,
    addLabel: 'Add admin',
  },
  TRANSACTION_KEY_ADDRESSES: {
    title: 'Transaction keys',
    hint: 'Optional. 0 or more hot wallets for capture / settle / convert / bridge. Cannot overlap SuperAdmin signers or Admins.',
    min: 0,
    max: 0,
    addLabel: 'Add transaction key',
  },
  REMOVE_ADDRESSES: {
    title: 'Addresses to revoke',
    hint: 'Optional. Used by Roles → remove-keys. Admin can only revoke a TransactionKey.',
    min: 0,
    max: 0,
    addLabel: 'Add address',
  },
};
const ADDRESS_SINGLES = {
  FEE_RECIPIENT_ADDRESS: {
    title: 'Fee recipient',
    hint: 'Exactly 1. Receives platform fees and dest leftover on Escrow and MerchantManager.',
  },
};

function splitEnvAddresses(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function envInput(key, value, secret) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const lab = document.createElement('label');
  lab.textContent = key;
  const row = document.createElement('div');
  row.className = secret ? 'secret-wrap' : '';
  const input = document.createElement('input');
  input.dataset.key = key;
  input.value = value || '';
  input.type = secret && !revealed[key] ? 'password' : 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  row.appendChild(input);
  if (secret) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.title = revealed[key] ? 'Hide' : 'Reveal';
    btn.innerHTML = '<span class="material-symbols-outlined">' + (revealed[key] ? 'visibility_off' : 'visibility') + '</span>';
    btn.addEventListener('click', () => {
      revealed[key] = !revealed[key];
      input.type = revealed[key] ? 'text' : 'password';
      btn.title = revealed[key] ? 'Hide' : 'Reveal';
      btn.innerHTML = '<span class="material-symbols-outlined">' + (revealed[key] ? 'visibility_off' : 'visibility') + '</span>';
    });
    row.appendChild(btn);
  }
  wrap.appendChild(lab);
  wrap.appendChild(row);
  return wrap;
}

function collectListAddresses(card) {
  return [...card.querySelectorAll('input[data-list-item]')].map((el) => el.value.trim()).filter(Boolean);
}

function updateListStatus(card, spec) {
  const addrs = collectListAddresses(card);
  const status = card.querySelector('.env-list-status');
  const addBtn = card.querySelector('[data-add-row]');
  const lower = addrs.map((a) => a.toLowerCase());
  const dup = lower.some((a, i) => lower.indexOf(a) !== i);
  const bad = addrs.filter((a) => !ADDR_RE.test(a));
  let text = addrs.length + ' set';
  let cls = 'env-list-status';
  if (spec.max && spec.max === spec.min) text = addrs.length + ' / ' + spec.max + ' required';
  else if (spec.min) text = addrs.length + ' set · min ' + spec.min;
  else text = addrs.length + ' set · optional';
  if (bad.length) {
    text += ' · invalid address';
    cls += ' warn';
  } else if (dup) {
    text += ' · duplicate';
    cls += ' warn';
  } else if (spec.max && addrs.length > spec.max) {
    text += ' · too many';
    cls += ' warn';
  } else if (addrs.length < spec.min) {
    text += ' · need ' + (spec.min - addrs.length) + ' more';
    cls += ' warn';
  } else {
    cls += ' ok';
  }
  if (status) {
    status.className = cls;
    status.textContent = text;
  }
  if (addBtn) addBtn.disabled = !!(spec.max && card.querySelectorAll('input[data-list-item]').length >= spec.max);
}

function addAddressRow(card, spec, value, slotLabel) {
  const rows = card.querySelector('.env-list-rows');
  const row = document.createElement('div');
  row.className = 'env-list-row';
  if (slotLabel) {
    const slot = document.createElement('span');
    slot.className = 'slot';
    slot.textContent = slotLabel;
    row.appendChild(slot);
  }
  const input = document.createElement('input');
  input.dataset.listItem = spec.key;
  input.placeholder = '0x…';
  input.value = value || '';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.addEventListener('input', () => updateListStatus(card, spec));
  row.appendChild(input);
  if (!spec.max || spec.max !== spec.min) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-btn';
    remove.title = 'Remove';
    remove.innerHTML = '<span class="material-symbols-outlined">close</span>';
    remove.addEventListener('click', () => {
      const count = card.querySelectorAll('.env-list-row').length;
      const keep = spec.min || 1;
      if (count <= keep) {
        input.value = '';
      } else {
        row.remove();
      }
      updateListStatus(card, spec);
    });
    row.appendChild(remove);
  }
  rows.appendChild(row);
  updateListStatus(card, spec);
}

function renderAddressList(key, spec, value) {
  spec = Object.assign({ key: key }, spec);
  const addrs = splitEnvAddresses(value);
  const card = document.createElement('div');
  card.className = 'env-list';
  card.dataset.listKey = key;
  const startCount = spec.max && spec.max === spec.min ? spec.max : Math.max(addrs.length, spec.min || 1);
  const head = document.createElement('div');
  head.className = 'env-list-head';
  head.innerHTML = '<h4>' + spec.title + '</h4><span class="env-list-key">' + key + '</span>';
  const hint = document.createElement('p');
  hint.className = 'env-list-hint';
  hint.textContent = spec.hint;
  const rows = document.createElement('div');
  rows.className = 'env-list-rows';
  card.appendChild(head);
  card.appendChild(hint);
  card.appendChild(rows);
  for (let i = 0; i < startCount; i++) {
    addAddressRow(card, spec, addrs[i] || '', spec.max === spec.min ? 'Signer ' + (i + 1) : '');
  }
  const actions = document.createElement('div');
  actions.className = 'env-list-actions';
  const status = document.createElement('span');
  status.className = 'env-list-status';
  actions.appendChild(status);
  if (!spec.max || spec.max !== spec.min) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn';
    add.dataset.addRow = '1';
    add.innerHTML = '<span class="material-symbols-outlined">add</span>' + spec.addLabel;
    add.addEventListener('click', () => {
      addAddressRow(card, spec, '');
      const inputs = card.querySelectorAll('input[data-list-item]');
      inputs[inputs.length - 1].focus();
    });
    actions.appendChild(add);
  }
  card.appendChild(actions);
  updateListStatus(card, spec);
  return card;
}

function renderAddressSingle(key, spec, value) {
  const card = document.createElement('div');
  card.className = 'env-list';
  const head = document.createElement('div');
  head.className = 'env-list-head';
  head.innerHTML = '<h4>' + spec.title + '</h4><span class="env-list-key">' + key + '</span>';
  const hint = document.createElement('p');
  hint.className = 'env-list-hint';
  hint.textContent = spec.hint;
  const row = document.createElement('div');
  row.className = 'env-list-row';
  const input = document.createElement('input');
  input.dataset.key = key;
  input.placeholder = '0x…';
  input.value = value || '';
  input.autocomplete = 'off';
  input.spellcheck = false;
  const status = document.createElement('span');
  status.className = 'env-list-status';
  const sync = () => {
    const v = input.value.trim();
    if (!v) {
      status.className = 'env-list-status warn';
      status.textContent = '0 / 1 required';
    } else if (!ADDR_RE.test(v)) {
      status.className = 'env-list-status warn';
      status.textContent = '1 set · invalid address';
    } else {
      status.className = 'env-list-status ok';
      status.textContent = '1 / 1 required';
    }
  };
  input.addEventListener('input', sync);
  row.appendChild(input);
  const actions = document.createElement('div');
  actions.className = 'env-list-actions';
  actions.appendChild(status);
  card.appendChild(head);
  card.appendChild(hint);
  card.appendChild(row);
  card.appendChild(actions);
  sync();
  return card;
}

function renderEnv(values) {
  envValues = values;
  const lists = $('envLists');
  const root = $('env');
  lists.innerHTML = '';
  root.innerHTML = '';
  Object.keys(ADDRESS_LISTS).forEach((key) => {
    lists.appendChild(renderAddressList(key, ADDRESS_LISTS[key], values[key] || ''));
  });
  Object.keys(ADDRESS_SINGLES).forEach((key) => {
    lists.appendChild(renderAddressSingle(key, ADDRESS_SINGLES[key], values[key] || ''));
  });
  Object.keys(values).forEach((key) => {
    if (ADDRESS_LISTS[key] || ADDRESS_SINGLES[key]) return;
    const secret = key.endsWith('_PRIVATE_KEY') || key.endsWith('_API_KEY');
    root.appendChild(envInput(key, values[key], secret));
  });
}

function collectEnv() {
  const values = {};
  document.querySelectorAll('#env input[data-key], #envLists input[data-key]').forEach((el) => {
    values[el.dataset.key] = el.value.trim();
  });
  document.querySelectorAll('#envLists .env-list[data-list-key]').forEach((card) => {
    values[card.dataset.listKey] = collectListAddresses(card).join(',');
  });
  return values;
}

function envAddressError(values) {
  const seen = {};
  const mark = (key, addr) => {
    const low = addr.toLowerCase();
    if (!seen[low]) seen[low] = [];
    seen[low].push(key);
  };
  for (const key of Object.keys(ADDRESS_LISTS)) {
    const spec = ADDRESS_LISTS[key];
    const addrs = splitEnvAddresses(values[key] || '');
    const bad = addrs.find((a) => !ADDR_RE.test(a));
    if (bad) return spec.title + ': invalid address ' + bad;
    const lower = addrs.map((a) => a.toLowerCase());
    if (lower.some((a, i) => lower.indexOf(a) !== i)) return spec.title + ': duplicate address';
    if (addrs.length < spec.min) return spec.title + ': need at least ' + spec.min;
    if (spec.max && addrs.length > spec.max) return spec.title + ': need exactly ' + spec.max;
    if (key !== 'REMOVE_ADDRESSES') addrs.forEach((a) => mark(key, a));
  }
  const fee = (values.FEE_RECIPIENT_ADDRESS || '').trim();
  if (!fee) return 'Fee recipient: required';
  if (!ADDR_RE.test(fee)) return 'Fee recipient: invalid address';
  const overlap = Object.keys(seen).find((addr) => seen[addr].length > 1);
  if (overlap) return 'Same address in ' + seen[overlap].join(' and ') + ': ' + overlap;
  return '';
}

function renderTable(rows, headers) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr>' + headers.map((h) => '<th>' + h + '</th>').join('') + '</tr>';
  const tbody = document.createElement('tbody');
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    r.forEach((c) => {
      const td = document.createElement('td');
      td.innerHTML = c;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

function renderMatrix() {
  const esc = catalog.matrix.escrow.map((r) => [r.fn, r.caller, '<span class="mono">' + r.key + '</span>']);
  const mm = catalog.matrix.merchantManager.map((r) => [r.fn, r.caller, '<span class="mono">' + r.key + '</span>']);
  $('matrixEscrow').innerHTML = '';
  $('matrixMm').innerHTML = '';
  $('matrixEscrow').appendChild(renderTable(esc, ['Function', 'Caller', 'Key']));
  $('matrixMm').appendChild(renderTable(mm, ['Function', 'Caller', 'Key']));
}

function explorerLink(addr) {
  const chain = selectedChain();
  if (!chain || !addr) return esc(addr || '—');
  return explorerHref(chain.explorerUrl, addr);
}

function explorerHref(explorerUrl, addr) {
  if (!addr) return '<span class="empty">—</span>';
  const base = (explorerUrl || '').replace(/\\/$/, '');
  const label = addr.length > 12 ? addr.slice(0, 6) + '…' + addr.slice(-4) : addr;
  if (!base) return '<span class="mono" title="' + esc(addr) + '">' + esc(label) + '</span>';
  return '<a class="mono" title="' + esc(addr) + '" href="' + base + '/address/' + encodeURIComponent(addr) + '" target="_blank" rel="noreferrer">' + esc(label) + '</a>';
}

function copyControl(value, label) {
  if (!value) return '';
  return '<button type="button" class="icon-btn copy-addr" data-copy="' + esc(value) + '" title="Copy ' + esc(label) + '"><span class="material-symbols-outlined">content_copy</span></button>';
}

function copyAbiControl(chainId, contract, label, available) {
  if (!available) return '';
  return '<button type="button" class="icon-btn copy-abi" data-chain-id="' + esc(chainId) +
    '" data-contract="' + esc(contract) + '" title="Copy ' + esc(label) + ' ABI"><span class="material-symbols-outlined">data_object</span></button>';
}

function addrCell(addr, explorerUrl, label, abi) {
  if (!addr) return '<span class="empty">Not deployed</span>';
  const abiBtn = abi
    ? copyAbiControl(abi.chainId, abi.contract, label, abi.available)
    : '';
  return '<div class="addr-cell">' + copyControl(addr, label) + abiBtn + explorerHref(explorerUrl, addr) + '</div>';
}

function renderAddressBook() {
  const root = $('addressBook');
  if (!root) return;
  const rows = (addressRows || []).filter((r) => {
    if (addrNet === 'testnets' || addrNet === 'mainnets') return r.networkType === addrNet;
    if (addrNet === 'deployed') return !!(r.escrow || r.merchantManager);
    return true;
  });
  document.querySelectorAll('#addrNet button').forEach((b) => {
    b.classList.toggle('active', b.dataset.addrNet === addrNet);
  });
  if (!rows.length) {
    root.innerHTML = '<p class="empty">No contracts in this filter.</p>';
    return;
  }
  const configured = addressBookWarRoomConfigured !== false;
  const tableRows = rows.map((r) => {
    const deployed = !!(r.escrow || r.merchantManager);
    const canRegister = deployed && configured && r.warRoomStatus !== 'unconfigured';
    const registerBtn = canRegister
      ? '<button type="button" class="btn war-room-register" data-chain-id="' +
        esc(r.chainId) +
        '" data-chain-name="' +
        esc(r.name) +
        '">Register</button>'
      : '';
    return [
      '<span class="pill">' + esc(r.networkType === 'unknown' ? 'unknown' : r.networkType) + '</span>',
      '<button type="button" class="chain-open" data-chain-id="' + esc(r.chainId) + '">' + esc(r.name) + '</button><div class="meta"><span class="mono">' + esc(r.chainId) + '</span></div>',
      addrCell(r.escrow, r.explorerUrl, r.name + ' Escrow', {
        chainId: r.chainId,
        contract: 'NodeRailsEscrow',
        available: !!r.escrow && r.hasEscrowAbi !== false,
      }),
      addrCell(r.merchantManager, r.explorerUrl, r.name + ' MerchantManager', {
        chainId: r.chainId,
        contract: 'NodeRailsMerchantManager',
        available: !!r.merchantManager && r.hasMerchantManagerAbi !== false,
      }),
      deployed ? warRoomRowLabel(r.warRoomStatus) : '—',
      (deployed
        ? copyControl([r.escrow, r.merchantManager].filter(Boolean).join('\\n'), r.name + ' both')
        : '') + (registerBtn ? ' ' + registerBtn : ''),
    ];
  });
  root.innerHTML = '';
  root.appendChild(renderTable(tableRows, ['Network', 'Chain', 'Escrow', 'Merchant Manager', 'War Room', '']));
}

let addressBookWarRoomConfigured = true;

async function loadAddressBook() {
  const data = await api('/api/addresses');
  addressRows = data.rows || [];
  addressBookWarRoomConfigured = data.warRoomConfigured !== false;
  renderAddressBook();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function roleChip(role) {
  if (!role) return '—';
  const cls = role === 'SuperAdmin' || role === 'Admin' ? 'pill ok' : 'pill';
  return '<span class="' + cls + '">' + esc(role) + '</span>';
}

function flagChip(v, onLabel, offLabel) {
  if (v === true) return '<span class="pill warn">' + onLabel + '</span>';
  if (v === false) return '<span class="pill ok">' + offLabel + '</span>';
  return '<span class="pill">unknown</span>';
}

function allowedChip(v) {
  if (v === true) return '<span class="pill ok">allowed</span>';
  if (v === false) return '<span class="pill">not allowed</span>';
  return '<span class="pill">unknown</span>';
}

function contractBalance(label) {
  const rows = state?.balances || [];
  const row = rows.find((x) => x.label === label);
  return row?.balance || '—';
}

function renderChainGrid() {
  renderSavedChains();
}

function savedChainList() {
  const byId = new Map();
  for (const c of state?.chains || []) byId.set(String(c.chainId), c);
  if (state?.chain && !byId.has(String(state.chain.chainId))) {
    byId.set(String(state.chain.chainId), state.chain);
  }
  if (sessionChainMeta && !byId.has(String(sessionChainMeta.chainId))) {
    byId.set(String(sessionChainMeta.chainId), sessionChainMeta);
  }
  for (const r of addressRows || []) {
    if (byId.has(String(r.chainId))) continue;
    byId.set(String(r.chainId), {
      chainId: r.chainId,
      name: r.name,
      networkType: r.networkType === 'unknown' ? 'mainnets' : r.networkType,
      explorerUrl: r.explorerUrl || '',
      nativeCurrency: 'ETH',
      rpcUrl: '',
    });
  }
  return [...byId.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function renderSavedChains() {
  const root = $('savedChains');
  if (!root) return;
  root.innerHTML = '';
  const selected = selectedChainId();
  const chains = savedChainList();
  if (!chains.length) {
    root.innerHTML = '<p class="empty">No saved chains yet. Pick from chainlist or enter an RPC.</p>';
    return;
  }
  chains.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'saved-chip' + (String(c.chainId) === selected ? ' active' : '');
    btn.textContent = c.name + ' · ' + c.chainId;
    btn.addEventListener('click', () => {
      if (!(sessionChainMeta && String(sessionChainMeta.chainId) === String(c.chainId))) {
        sessionRpcUrl = '';
      }
      sessionChainMeta = c;
      selectChain(String(c.chainId));
    });
    root.appendChild(btn);
  });
}

function renderChainlistResults() {
  const root = $('chainlistResults');
  if (!root) return;
  const q = chainlistQuery.trim().toLowerCase();
  let rows = chainlistItems;
  if (q) {
    rows = rows.filter((c) =>
      String(c.chainId).includes(q)
      || (c.name || '').toLowerCase().includes(q)
      || (c.shortName || '').toLowerCase().includes(q)
    );
  }
  rows = rows.slice(0, 80);
  root.innerHTML = '';
  if (!chainlistItems.length) {
    root.innerHTML = '<p class="empty" style="padding:12px">Loading chainlist…</p>';
    return;
  }
  if (!rows.length) {
    root.innerHTML = '<p class="empty" style="padding:12px">No matches.</p>';
    return;
  }
  rows.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chainlist-row' + (selectedChainlistId === c.chainId ? ' selected' : '');
    btn.innerHTML =
      '<span><strong>' + esc(c.name) + '</strong><span class="meta">' +
      esc(c.shortName || '') + (c.shortName ? ' · ' : '') + 'chainId ' + esc(c.chainId) +
      '</span></span><span class="pill">' + (c.isTestnet ? 'testnet' : 'mainnet') + '</span>';
    btn.addEventListener('click', () => {
      selectedChainlistId = c.chainId;
      fillChainlistRpc(c);
      renderChainlistResults();
    });
    root.appendChild(btn);
  });
}

function fillChainlistRpc(chain) {
  const sel = $('chainlistRpc');
  if (!sel) return;
  sel.innerHTML = '';
  (chain.rpcs || []).forEach((url) => {
    const opt = document.createElement('option');
    opt.value = url;
    try { opt.textContent = new URL(url).host; } catch { opt.textContent = url; }
    sel.appendChild(opt);
  });
}

async function loadChainlistCatalog() {
  const status = $('chainPickStatus');
  try {
    if (status) status.textContent = 'Fetching chainlist.org/rpcs.json…';
    const data = await api('/api/chainlist');
    chainlistItems = data.items || [];
    renderChainlistResults();
    if (status) status.textContent = chainlistItems.length + ' networks from chainlist.';
  } catch (e) {
    if (status) status.textContent = 'Chainlist failed: ' + e.message;
  }
}

async function activateNetwork(meta) {
  const status = $('chainPickStatus');
  try {
    if (status) status.textContent = 'Probing RPC…';
    const probe = await api('/api/rpc/probe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chainId: meta.chainId, rpcUrl: meta.rpcUrl }),
    });
    if (!probe.ok) {
      const msg = 'RPC probe failed — URL did not return chainId ' + meta.chainId;
      if (status) status.textContent = msg;
      alert(msg);
      return;
    }
    if (status) status.textContent = 'RPC ok · ' + (probe.host || '');
    sessionRpcUrl = meta.rpcUrl;
    sessionChainMeta = {
      chainId: Number(meta.chainId),
      name: meta.name || ('Chain ' + meta.chainId),
      explorerUrl: meta.explorerUrl || '',
      nativeCurrency: meta.nativeCurrency || 'ETH',
      networkType: meta.isTestnet ? 'testnets' : 'mainnets',
      rpcUrl: meta.rpcUrl,
    };
    await selectChain(String(meta.chainId));
  } catch (e) {
    if (status) status.textContent = e.message;
    alert(e.message);
  }
}

function renderHero() {
  const chain = selectedChain() || state?.chain || sessionChainMeta;
  $('chainHeroName').textContent = chain ? chain.name : '—';
  if (!chain) {
    $('chainHeroMeta').textContent = '';
    return;
  }
  const exp = (chain.explorerUrl || '').replace(/\\/$/, '');
  const rpcLabel = state?.rpc?.host
    || (() => { try { return sessionRpcUrl ? new URL(sessionRpcUrl).host : ''; } catch { return ''; } })();
  $('chainHeroMeta').innerHTML =
    '<span class="mono">' + esc(chain.chainId) + '</span> · ' +
    esc(chain.nativeCurrency || 'ETH') + ' · ' + esc(chain.networkType || '') +
    (rpcLabel ? ' · RPC ' + esc(rpcLabel) + (state?.rpc?.fallback ? ' (chainlist)' : '') : '') +
    (exp ? ' · <a href="' + esc(exp) + '" target="_blank" rel="noreferrer">explorer</a>' : '');
}

function renderCurrentContracts() {
  const deployed = state?.deployed || {};
  const root = $('currentContracts');
  root.innerHTML = '';
  const cards = [
    ['Escrow', 'NodeRailsEscrow', 'escrow'],
    ['MerchantManager', 'NodeRailsMerchantManager', 'merchantManager'],
  ];
  cards.forEach(([title, key, balLabel]) => {
    const addr = deployed[key];
    const card = document.createElement('div');
    card.className = 'contract-card';
    if (!addr) {
      card.innerHTML = '<div class="label">' + title + '</div><p class="empty">Not deployed on this chain.</p>';
    } else {
      card.innerHTML =
        '<div class="label">' + title + '</div>' +
        '<div class="mono" style="margin-bottom:8px">' + explorerLink(addr) + '</div>' +
        '<div class="meta">Native balance: <span class="mono">' + esc(contractBalance(balLabel)) + '</span></div>' +
        '<div class="meta" style="margin-top:4px"><span class="pill ok">current</span></div>';
    }
    root.appendChild(card);
  });
}

function renderBalances() {
  const b = (state?.balances || []).filter((x) => x.label !== 'escrow' && x.label !== 'merchantManager');
  const rows = b.map((x) => [
    '<strong>' + esc(x.label) + '</strong>',
    explorerLink(x.address),
    '<span class="mono">' + esc(x.balance || '—') + '</span>',
    roleChip(x.escrowRole),
    roleChip(x.mmRole),
  ]);
  const root = $('balances');
  root.innerHTML = '';
  root.appendChild(renderTable(rows.length ? rows : [['No addresses in .env', '', '', '', '']], ['Who', 'Address', 'Native', 'Escrow role', 'MM role']));
}

function renderHistory() {
  const deployed = state?.deployed || {};
  const current = new Set(
    [deployed.NodeRailsEscrow, deployed.NodeRailsMerchantManager].filter(Boolean).map((a) => a.toLowerCase()),
  );
  const items = (state?.history || [])
    .filter((h) => String(h.chainId) === selectedChainId())
    .slice()
    .reverse();
  const rows = items.map((h) => {
    const isCurrent = h.address && current.has(String(h.address).toLowerCase()) && !h.replacedBy;
    return [
      esc(h.contract || ''),
      explorerLink(h.address),
      isCurrent ? '<span class="pill ok">current</span>' : (h.replacedBy ? explorerLink(h.replacedBy) : '—'),
      esc(h.replacedAt || h.deployedAt || ''),
    ];
  });
  const root = $('history');
  root.innerHTML = '';
  if (!rows.length) {
    root.innerHTML = '<p class="empty">No past deploys recorded for this chain.</p>';
    return;
  }
  root.appendChild(renderTable(rows, ['Contract', 'Address', 'Status / replaced by', 'When']));
}

function renderAllowTable(rows, command, listId) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '16px';
  if (!rows.length) {
    wrap.innerHTML = '<p class="empty">No addresses from the last deploy on this chain.</p>';
  } else {
    const tableRows = rows.map((r) => [
      explorerLink(r.address),
      allowedChip(r.allowed),
      '<button type="button" class="btn" data-run="' + command + '" data-contract="escrow" data-addr="' + esc(r.address) + '" data-bool="' + (r.allowed === true ? 'false' : 'true') + '">' +
        (r.allowed === true ? 'Revoke' : 'Allow') + '</button>',
    ]);
    wrap.appendChild(renderTable(tableRows, ['Address', 'On-chain', '']));
  }
  const add = document.createElement('div');
  add.className = 'row';
  add.style.marginTop = '12px';
  add.innerHTML =
    '<div class="field"><label>Address not in last deploy</label><input id="' + listId + '" placeholder="0x…" spellcheck="false"></div>' +
    '<button type="button" class="btn" data-check="' + command + '" data-from="' + listId + '">Check</button>' +
    '<button type="button" class="btn primary" data-run="' + command + '" data-contract="escrow" data-from="' + listId + '" data-bool="true">Allow</button>' +
    '<button type="button" class="btn" data-run="' + command + '" data-contract="escrow" data-from="' + listId + '" data-bool="false">Revoke</button>';
  wrap.appendChild(add);
  return wrap;
}

function renderEscrowSettings() {
  const root = $('settingsEscrow');
  root.innerHTML = '';
  const on = state?.onchain?.escrow;
  if (!on) {
    root.innerHTML = '<p class="empty">Deploy escrow on this chain to read and update settings.</p>';
    return;
  }
  if (on.rpcError) {
    const warn = document.createElement('p');
    warn.className = 'err';
    warn.textContent = 'Could not read live values (RPC). You can still set them below.';
    root.appendChild(warn);
  }
  const status = document.createElement('dl');
  status.className = 'kv';
  status.innerHTML =
    '<dt>Contract</dt><dd>' + explorerLink(on.address) + '</dd>' +
    '<dt>Paused</dt><dd>' + flagChip(on.paused, 'paused', 'live') + '</dd>' +
    '<dt>Full stop</dt><dd>' + flagChip(on.fullStopped, 'full stop', 'off') + '</dd>' +
    '<dt>Fee-on-transfer</dt><dd>' + flagChip(on.feeOnTransferEnabled, 'on (store received)', 'exact match') + '</dd>' +
    '<dt>Fee recipient</dt><dd>' + (on.feeRecipient ? explorerLink(on.feeRecipient) : (on.rpcError ? '<span class="pill warn">RPC error</span>' : '—')) + '</dd>';
  root.appendChild(status);

  const feeRow = document.createElement('div');
  feeRow.className = 'row';
  feeRow.innerHTML =
    '<div class="field"><label>Set fee recipient</label><input id="escrowFeeNew" spellcheck="false"></div>' +
    '<button type="button" class="btn primary" data-run="set-fee-recipient" data-contract="escrow" data-from="escrowFeeNew">Set</button>';
  root.appendChild(feeRow);
  $('escrowFeeNew').value = on.feeRecipient || '';

  const pauseRow = document.createElement('div');
  pauseRow.className = 'actions';
  pauseRow.innerHTML =
    '<button type="button" class="btn" data-run="pause" data-contract="escrow">Pause</button>' +
    '<button type="button" class="btn" data-run="unpause" data-contract="escrow">Unpause</button>' +
    '<button type="button" class="btn danger" data-run="full-stop" data-contract="escrow" data-danger="1">Full stop</button>' +
    '<button type="button" class="btn" data-run="lift-full-stop" data-contract="escrow" data-danger="1">Lift full stop</button>';
  root.appendChild(pauseRow);

  const fotRow = document.createElement('div');
  fotRow.className = 'actions';
  fotRow.innerHTML =
    '<button type="button" class="btn" data-run="set-fee-on-transfer" data-contract="escrow" data-bool="true">Enable fee-on-transfer</button>' +
    '<button type="button" class="btn" data-run="set-fee-on-transfer" data-contract="escrow" data-bool="false">Exact match (off)</button>';
  root.appendChild(fotRow);

  [['Swap routers', on.swapRouters, 'set-swap-router', 'extraSwap'],
   ['Bridge routers', on.bridgeRouters, 'set-bridge-router', 'extraBridge'],
   ['Settlement tokens', on.settlementTokens, 'set-settlement-token', 'extraToken']].forEach(([title, rows, cmd, id]) => {
    const h = document.createElement('h3');
    h.style.margin = '20px 0 8px';
    h.style.fontSize = '14px';
    h.textContent = title;
    root.appendChild(h);
    root.appendChild(renderAllowTable(rows || [], cmd, id));
  });

  const role = document.createElement('div');
  role.innerHTML = '<h3 style="margin:20px 0 8px;font-size:14px">Set key role</h3>';
  const roleRow = document.createElement('div');
  roleRow.className = 'row';
  roleRow.innerHTML =
    '<div class="field"><label>Address</label><input id="escrowRoleAddr" placeholder="0x…" spellcheck="false"></div>' +
    '<div class="field"><label>Role</label><select id="escrowRoleVal"><option>None</option><option>TransactionKey</option><option>Admin</option><option>SuperAdmin</option></select></div>' +
    '<button type="button" class="btn" data-run="set-key-role" data-contract="escrow" data-from="escrowRoleAddr" data-from2="escrowRoleVal">Set role</button>';
  role.appendChild(roleRow);
  root.appendChild(role);
  bindSettings(root);
}

function renderMmSettings() {
  const root = $('settingsMm');
  root.innerHTML = '';
  const on = state?.onchain?.merchantManager;
  if (!on) {
    root.innerHTML = '<p class="empty">Deploy MerchantManager on this chain to read and update settings.</p>';
    return;
  }
  if (on.rpcError) {
    const warn = document.createElement('p');
    warn.className = 'err';
    warn.textContent = 'Could not read live values (RPC). You can still set them below.';
    root.appendChild(warn);
  }
  const status = document.createElement('dl');
  status.className = 'kv';
  status.innerHTML =
    '<dt>Contract</dt><dd>' + explorerLink(on.address) + '</dd>' +
    '<dt>Paused</dt><dd>' + flagChip(on.paused, 'paused', 'live') + '</dd>' +
    '<dt>Full stop</dt><dd>' + flagChip(on.fullStopped, 'full stop', 'off') + '</dd>' +
    '<dt>Fee recipient</dt><dd>' + (on.feeRecipient ? explorerLink(on.feeRecipient) : (on.rpcError ? '<span class="pill warn">RPC error</span>' : '—')) + '</dd>';
  root.appendChild(status);
  const feeRow = document.createElement('div');
  feeRow.className = 'row';
  feeRow.innerHTML =
    '<div class="field"><label>Set fee recipient</label><input id="mmFeeNew" spellcheck="false"></div>' +
    '<button type="button" class="btn primary" data-run="set-fee-recipient" data-contract="merchant-manager" data-from="mmFeeNew">Set</button>';
  root.appendChild(feeRow);
  $('mmFeeNew').value = on.feeRecipient || '';
  const pauseRow = document.createElement('div');
  pauseRow.className = 'actions';
  pauseRow.innerHTML =
    '<button type="button" class="btn" data-run="pause" data-contract="merchant-manager">Pause</button>' +
    '<button type="button" class="btn" data-run="unpause" data-contract="merchant-manager">Unpause</button>' +
    '<button type="button" class="btn danger" data-run="full-stop" data-contract="merchant-manager" data-danger="1">Full stop</button>' +
    '<button type="button" class="btn" data-run="lift-full-stop" data-contract="merchant-manager" data-danger="1">Lift full stop</button>';
  root.appendChild(pauseRow);
  const role = document.createElement('div');
  role.innerHTML = '<h3 style="margin:20px 0 8px;font-size:14px">Set key role</h3>';
  const roleRow = document.createElement('div');
  roleRow.className = 'row';
  roleRow.innerHTML =
    '<div class="field"><label>Address</label><input id="mmRoleAddr" placeholder="0x…" spellcheck="false"></div>' +
    '<div class="field"><label>Role</label><select id="mmRoleVal"><option>None</option><option>TransactionKey</option><option>Admin</option><option>SuperAdmin</option></select></div>' +
    '<button type="button" class="btn" data-run="set-key-role" data-contract="merchant-manager" data-from="mmRoleAddr" data-from2="mmRoleVal">Set role</button>';
  role.appendChild(roleRow);
  root.appendChild(role);
  bindSettings(root);
}

function bindSettings(root) {
  root.querySelectorAll('[data-check]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const from = $(btn.dataset.from);
      const addr = (from?.value || '').trim();
      if (!addr) { alert('Enter an address'); return; }
      const fn = btn.dataset.check === 'set-swap-router' ? 'allowedSwapRouters'
        : btn.dataset.check === 'set-bridge-router' ? 'allowedBridgeRouters'
        : 'allowedSettlementTokens';
      try {
        const data = await api('/api/call', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chainId: selectedChainId(), contract: 'escrow', function: fn, args: [addr] }),
        });
        alert(addr + ' → ' + data.result);
      } catch (e) {
        alert(e.message);
      }
    });
  });
  root.querySelectorAll('[data-run]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const args = [];
      if (btn.dataset.addr) args.push(btn.dataset.addr);
      if (btn.dataset.from) {
        const v = ($(btn.dataset.from)?.value || '').trim();
        if (!v) { alert('Enter a value'); return; }
        args.push(v);
      }
      if (btn.dataset.from2) args.push($(btn.dataset.from2).value);
      if (btn.dataset.bool) args.push(btn.dataset.bool);
      runAction({
        action: 'settings',
        target: btn.dataset.run,
        args,
        contract: btn.dataset.contract,
      }, btn.dataset.danger === '1');
    });
  });
}

function renderChainWorkspace() {
  renderChainGrid();
  renderHero();
  renderCurrentContracts();
  renderBalances();
  renderHistory();
  renderEscrowSettings();
  renderMmSettings();
  renderWarRoom();
  renderInteract();
  fillDeployAllowlists();
}

function renderWarRoom() {
  renderWarRoomInto('warRoomStatus', 'runWarRoomRegister');
  renderWarRoomInto('warRoomStatusContracts', 'runWarRoomRegisterContracts');
}

function renderWarRoomInto(statusId, buttonId) {
  const statusEl = $(statusId);
  const btn = $(buttonId);
  if (!statusEl || !btn) return;
  const wr = state?.warRoom;
  if (!wr) {
    statusEl.textContent = 'War Room status unavailable.';
    btn.disabled = true;
    return;
  }
  if (!wr.configured) {
    statusEl.textContent = wr.message || 'Set WAR_ROOM_URL and WAR_ROOM_DEPLOY_API_KEY in Env.';
    btn.disabled = true;
    return;
  }
  if (!wr.hasLocal) {
    statusEl.textContent = 'No local Escrow / MerchantManager for this chain — deploy first.';
    btn.disabled = true;
    return;
  }
  if (wr.status === 'matched') {
    statusEl.textContent = 'Already registered — War Room addresses match local deploy. You can still re-register to refresh the row.';
    btn.disabled = false;
  } else if (wr.status === 'stale') {
    statusEl.textContent =
      'War Room has this chain, but addresses differ from local. Register to update.';
    btn.disabled = false;
  } else if (wr.status === 'missing') {
    statusEl.textContent = 'Not registered in War Room yet.';
    btn.disabled = false;
  } else {
    statusEl.textContent = wr.message || 'Could not reach War Room.';
    btn.disabled = false;
  }
}

function warRoomRowLabel(status) {
  if (status === 'matched') return '<span class="pill ok">registered</span>';
  if (status === 'stale') return '<span class="pill warn">stale</span>';
  if (status === 'missing') return '<span class="pill">not registered</span>';
  if (status === 'unconfigured') return '<span class="pill">env unset</span>';
  return '<span class="pill">—</span>';
}

function isTempoChainId(chainId) {
  const id = Number(chainId);
  return id === 4217 || id === 42431;
}

function syncDeployTempoFields() {
  const wrap = $('deployTempoFeeWrap');
  const input = $('deployTempoFeeToken');
  const chainId = state?.chain?.chainId ?? selectedChainId();
  const tempo = isTempoChainId(chainId);
  if (wrap) wrap.style.display = tempo ? '' : 'none';
  if (tempo && input && !input.value.trim() && state?.chain?.tempoFeeToken) {
    input.value = state.chain.tempoFeeToken;
  }
}

function fillDeployAllowlists() {
  const lists = state?.allowlists || {};
  const swap = $('deploySwapRouters');
  const bridge = $('deployBridgeRouters');
  const tokens = $('deploySettlementTokens');
  if (swap) swap.value = lists.swapRouters || '';
  if (bridge) bridge.value = lists.bridgeRouters || '';
  if (tokens) tokens.value = lists.settlementTokens || '';
  syncDeployTempoFields();
}

function argField(arg) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const lab = document.createElement('label');
  lab.textContent = arg.name + ' (' + arg.type + ')';
  wrap.appendChild(lab);
  if (arg.type === 'bool') {
    const s = document.createElement('select');
    s.innerHTML = '<option value="true">true</option><option value="false">false</option>';
    s.dataset.arg = arg.name;
    wrap.appendChild(s);
    return wrap;
  }
  if (arg.type === 'role') {
    const s = document.createElement('select');
    s.innerHTML = ['None','TransactionKey','Admin','SuperAdmin'].map((r) => '<option>' + r + '</option>').join('');
    s.dataset.arg = arg.name;
    wrap.appendChild(s);
    return wrap;
  }
  const input = document.createElement('input');
  input.dataset.arg = arg.name;
  input.placeholder = arg.type;
  wrap.appendChild(input);
  return wrap;
}

function collectArgs(box) {
  return [...box.querySelectorAll('[data-arg]')].map((el) => el.value);
}

function fnEnabled(fn, deployed, roles, env) {
  const hasContract =
    fn.contract === 'escrow' ? !!deployed.NodeRailsEscrow :
    fn.contract === 'merchant-manager' ? !!deployed.NodeRailsMerchantManager : true;
  if (!hasContract) return { ok: false, reason: 'not deployed' };
  if (fn.kind === 'view') return { ok: true };
  if (!fn.signerEnv || !env[fn.signerEnv]) return { ok: false, reason: 'missing ' + fn.signerEnv };
  const need = fn.requiredRole;
  if (need === 'anyone') return { ok: true };
  if (need === 'Admin') {
    const role = fn.contract === 'merchant-manager' ? roles.adminMm : roles.adminEscrow;
    if (!role || role === 'unknown') return { ok: true, reason: 'on-chain role unknown' };
    if (fn.signerEnv === 'SUPER_ADMIN_PRIVATE_KEY') {
      const s = fn.contract === 'merchant-manager' ? roles.superMm : roles.superEscrow;
      return !s || s === 'unknown' || s === 'SuperAdmin' ? { ok: true } : { ok: false, reason: 'signer is not SuperAdmin on-chain' };
    }
    return ['Admin', 'SuperAdmin'].includes(role) ? { ok: true } : { ok: false, reason: 'admin key is not Admin on-chain' };
  }
  if (need === 'SuperAdmin') {
    const role = fn.contract === 'merchant-manager' ? roles.superMm : roles.superEscrow;
    if (!role || role === 'unknown') return { ok: true, reason: 'on-chain role unknown' };
    return role === 'SuperAdmin' ? { ok: true } : { ok: false, reason: 'super admin key is not SuperAdmin on-chain' };
  }
  return { ok: true };
}

function renderInteract() {
  const deployed = state?.deployed || {};
  const env = envValues;
  const roles = state?.signerRoles || {};
  const root = $('interact');
  root.innerHTML = '';
  const hasAny = deployed.NodeRailsEscrow || deployed.NodeRailsMerchantManager;
  $('interactHint').hidden = !!hasAny;
  if (!hasAny) return;
  (catalog.functions || []).forEach((fn) => {
    if (fn.contract === 'escrow' && !deployed.NodeRailsEscrow) return;
    if (fn.contract === 'merchant-manager' && !deployed.NodeRailsMerchantManager) return;
    const box = document.createElement('div');
    box.className = 'fn';
    const title = document.createElement('h3');
    title.textContent = fn.contract + ' · ' + fn.name;
    box.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML =
      '<span class="pill">' + fn.kind + '</span>' +
      '<span class="pill">caller: ' + fn.requiredRole + '</span>' +
      (fn.signerEnv ? '<span class="pill mono">' + fn.signerEnv + '</span>' : '<span class="pill">no key</span>') +
      (fn.danger ? '<span class="pill warn">danger</span>' : '') +
      (fn.note ? '<div style="margin-top:6px">' + fn.note + '</div>' : '');
    box.appendChild(meta);
    const argsRow = document.createElement('div');
    argsRow.className = 'row';
    fn.args.forEach((a) => argsRow.appendChild(argField(a)));
    if (fn.args.length) box.appendChild(argsRow);
    const enabled = fnEnabled(fn, deployed, roles, env);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = fn.kind === 'view' ? 'Call' : 'Send';
    btn.className = fn.danger ? 'btn danger' : fn.kind === 'write' ? 'btn primary' : 'btn';
    btn.disabled = !enabled.ok;
    if (!enabled.ok) {
      const why = document.createElement('div');
      why.className = 'meta';
      why.textContent = enabled.reason;
      box.appendChild(why);
    }
    btn.addEventListener('click', async () => {
      const args = collectArgs(box);
      try {
        if (fn.kind === 'view') {
          const data = await api('/api/call', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              ...sessionFields(),
              contract: fn.contract,
              function: fn.name,
              args,
            }),
          });
          appendLog(fn.name + ' => ' + data.result);
          openLog();
        } else {
          const extra = confirmRun(!!fn.danger);
          if (fn.danger && extra.confirmDanger === false) return;
          await api('/api/run', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              ...sessionFields(),
              action: 'settings',
              target: fn.settingsCommand,
              args,
              contract: fn.contract,
              ...extra,
            }),
          });
          openLog();
        }
      } catch (e) {
        appendLog('error: ' + e.message);
        openLog();
        alert(e.message);
      }
    });
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.appendChild(btn);
    box.appendChild(actions);
    root.appendChild(box);
  });
}

function fillChains() {
  const sel = $('chain');
  const prev = sel.value || (sessionChainMeta && String(sessionChainMeta.chainId)) || '';
  sel.innerHTML = '';
  const listed = savedChainList();
  listed.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = String(c.chainId);
    opt.textContent = c.name + ' (' + c.chainId + ') · ' + (c.networkType || '');
    sel.appendChild(opt);
  });
  const prefer = state?.chain ? String(state.chain.chainId) : prev;
  if (prefer && [...sel.options].some((o) => o.value === prefer)) sel.value = prefer;
  else if (sel.options.length) sel.selectedIndex = 0;
  const chain = selectedChain() || sessionChainMeta;
  if (chain) netFilter = chain.networkType || netFilter;
}

async function reloadChain() {
  if (chainBusy) return;
  hideDeployQuote();
  $('banner').hidden = true;
  chainBusy = true;
  $('chainBusy').hidden = false;
  try {
    const id = selectedChainId();
    state = await api('/api/state?' + stateQuery(id).toString());
    const chain = selectedChain();
    if (chain) netFilter = chain.networkType;
    if (state?.rpc && !sessionRpcUrl && state.chain?.rpcUrl) {
      // keep curated rpc for session when none chosen
      sessionRpcUrl = '';
    }
    // Keep session name/testnet flags aligned with enriched server chain
    if (state?.chain && sessionChainMeta && String(state.chain.chainId) === String(sessionChainMeta.chainId)) {
      sessionChainMeta = {
        ...sessionChainMeta,
        name: state.chain.name || sessionChainMeta.name,
        explorerUrl: state.chain.explorerUrl || sessionChainMeta.explorerUrl || '',
        nativeCurrency: state.chain.nativeCurrency || sessionChainMeta.nativeCurrency || 'ETH',
        networkType: state.chain.networkType || sessionChainMeta.networkType,
      };
    }
    fillChains();
    renderChainWorkspace();
  } catch (e) {
    $('banner').hidden = false;
    $('banner').textContent = e.message;
  } finally {
    chainBusy = false;
    $('chainBusy').hidden = true;
  }
}

async function selectChain(id) {
  if (chainBusy) return;
  const sel = $('chain');
  if (sel && ![...sel.options].some((o) => o.value === String(id))) {
    const meta = sessionChainMeta && String(sessionChainMeta.chainId) === String(id)
      ? sessionChainMeta
      : { chainId: id, name: 'Chain ' + id, networkType: '' };
    const opt = document.createElement('option');
    opt.value = String(id);
    opt.textContent = (meta.name || ('Chain ' + id)) + ' (' + id + ') · ' + (meta.networkType || '');
    sel.appendChild(opt);
  }
  if (sel.value === String(id)) {
    renderChainGrid();
    await reloadChain();
    return;
  }
  sel.value = String(id);
  await reloadChain();
}

async function loadAll() {
  if (chainBusy) return;
  $('banner').hidden = true;
  chainBusy = true;
  $('chainBusy').hidden = false;
  try {
    catalog = await api('/api/catalog');
    envValues = (await api('/api/env')).values;
    renderEnv(envValues);
    renderMatrix();
    await loadAddressBook();
    state = await api('/api/state?' + stateQuery(selectedChainId() || '').toString());
    fillChains();
    renderChainWorkspace();
    void loadChainlistCatalog();
  } catch (e) {
    $('banner').hidden = false;
    $('banner').textContent = e.message;
  } finally {
    chainBusy = false;
    $('chainBusy').hidden = true;
  }
}

$('addrNet').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-addr-net]');
  if (!btn) return;
  addrNet = btn.dataset.addrNet;
  renderAddressBook();
});
$('addressBook').addEventListener('click', async (e) => {
  const copy = e.target.closest('.copy-addr');
  if (copy) {
    const value = copy.dataset.copy || '';
    try {
      await navigator.clipboard.writeText(value);
      copy.classList.add('copied');
      copy.title = 'Copied';
      setTimeout(() => {
        copy.classList.remove('copied');
        copy.title = 'Copy';
      }, 1200);
    } catch {
      alert('Could not copy');
    }
    return;
  }
  const copyAbi = e.target.closest('.copy-abi');
  if (copyAbi) {
    const chainId = copyAbi.dataset.chainId || '';
    const contract = copyAbi.dataset.contract || '';
    try {
      copyAbi.disabled = true;
      const data = await api('/api/abi?chainId=' + encodeURIComponent(chainId) + '&contract=' + encodeURIComponent(contract));
      await navigator.clipboard.writeText(JSON.stringify(data.abi, null, 2));
      copyAbi.classList.add('copied');
      copyAbi.title = 'ABI copied';
      setTimeout(() => {
        copyAbi.classList.remove('copied');
        copyAbi.title = 'Copy ABI';
      }, 1200);
    } catch (err) {
      alert(err.message || 'Could not copy ABI');
    } finally {
      copyAbi.disabled = false;
    }
    return;
  }
  const register = e.target.closest('.war-room-register');
  if (register) {
    runAction({
      action: 'register-war-room',
      target: $('warRoomTargetContracts')?.value || 'all',
      chainId: register.dataset.chainId,
    });
    return;
  }
  const open = e.target.closest('.chain-open');
  if (open) {
    await selectChain(open.dataset.chainId);
    setTab('overview');
  }
});
$('chain').addEventListener('change', () => reloadChain());
$('refresh').addEventListener('click', loadAll);
$('saveEnv').addEventListener('click', async () => {
  try {
    const values = collectEnv();
    const problem = envAddressError(values);
    if (problem) {
      alert(problem);
      return;
    }
    const data = await api('/api/env', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ values: values }),
    });
    renderEnv(data.values);
    await reloadChain();
    appendLog('.env saved');
  } catch (e) {
    alert(e.message);
  }
});

async function runAction(body, danger) {
  try {
    const base = sessionFields();
    const chainId = body.chainId != null ? String(body.chainId) : base.chainId;
    const skipMainnetConfirm = body.action === 'register-war-room';
    const extra = skipMainnetConfirm ? {} : confirmRun(!!danger, chainId);
    if (danger && extra.confirmDanger === false) return;
    await api('/api/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...base, ...body, chainId, ...extra }),
    });
    openLog();
  } catch (e) {
    appendLog('error: ' + e.message);
    openLog();
    alert(e.message);
  }
}

let deployQuote = null;
let deployBump = 'min';

function deployBody() {
  const body = {
    ...sessionFields(),
    target: $('deployTarget').value,
    swapRouters: $('deploySwapRouters').value,
    bridgeRouters: $('deployBridgeRouters').value,
    settlementTokens: $('deploySettlementTokens').value,
  };
  const chainId = state?.chain?.chainId ?? selectedChainId();
  if (isTempoChainId(chainId)) {
    body.tempoFeeToken = ($('deployTempoFeeToken')?.value || '').trim();
  }
  return body;
}

function hideDeployQuote() {
  deployQuote = null;
  deployBump = 'min';
  $('deployQuote').hidden = true;
  $('deployQuoteBody').hidden = true;
  $('deployQuoteStatus').textContent = 'Estimating gas and network fee.';
}

function renderDeployQuote() {
  if (!deployQuote) return;
  const bump = deployQuote.bumps.find((b) => b.id === deployBump) || deployQuote.bumps[0];
  if (deployQuote.isTempo) {
    $('deployQuoteMax').textContent =
      'Up to ~' + bump.maxNative + ' (network fee; paid from TIP-20 ' + (deployQuote.tempoFeeToken || 'fee token') + ')';
    $('deployQuoteMeta').textContent =
      'Simulated ' + deployQuote.gasUsed + ' gas (Tempo uses higher limits). Lock ' + bump.maxFeeGwei +
      ' gwei max fee. Ensure deployer holds enough fee token.';
  } else {
    $('deployQuoteMax').textContent = 'Pay at most ' + bump.maxNative;
    $('deployQuoteMeta').textContent =
      'Simulated ' + deployQuote.gasUsed + ' gas. Base ' + deployQuote.baseFeeGwei +
      ' gwei + tip ' + deployQuote.priorityFeeGwei + ' gwei. Lock ' + bump.maxFeeGwei + ' gwei.';
  }
  const seg = $('deployBumps');
  seg.innerHTML = '';
  for (const b of deployQuote.bumps) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = b.label;
    btn.dataset.bump = b.id;
    if (b.id === deployBump) btn.className = 'active';
    btn.addEventListener('click', () => {
      deployBump = b.id;
      renderDeployQuote();
    });
    seg.appendChild(btn);
  }
}

$('runDeploy').addEventListener('click', async () => {
  hideDeployQuote();
  $('deployQuote').hidden = false;
  $('runDeploy').disabled = true;
  $('deployQuoteStatus').textContent = 'Estimating gas and network fee. This runs a Forge dry run.';
  try {
    deployQuote = await api('/api/deploy/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...deployBody(), chainId: selectedChainId() }),
    });
    deployBump = 'min';
    $('deployQuoteStatus').textContent = 'Pick a lock, then confirm. Minimum is the current network fee.';
    $('deployQuoteBody').hidden = false;
    renderDeployQuote();
  } catch (e) {
    $('deployQuoteStatus').textContent = e.message;
    appendLog('error: ' + e.message);
    openLog();
  } finally {
    $('runDeploy').disabled = false;
  }
});

$('deployQuoteCancel').addEventListener('click', hideDeployQuote);

$('deployQuoteConfirm').addEventListener('click', () => {
  if (!deployQuote) return;
  runAction({
    action: 'deploy',
    ...deployBody(),
    quoteId: deployQuote.quoteId,
    bump: deployBump,
  });
  hideDeployQuote();
});

$('deployTarget').addEventListener('change', hideDeployQuote);
$('deployTempoFeeToken')?.addEventListener('input', hideDeployQuote);
$('deploySwapRouters').addEventListener('input', hideDeployQuote);
$('deployBridgeRouters').addEventListener('input', hideDeployQuote);
$('deploySettlementTokens').addEventListener('input', hideDeployQuote);
$('runRoles').addEventListener('click', () => runAction({ action: 'roles', target: $('rolesCmd').value }));
$('runWarRoomRegister').addEventListener('click', () =>
  runAction({ action: 'register-war-room', target: $('warRoomTarget').value }),
);
$('runWarRoomRegisterContracts').addEventListener('click', () =>
  runAction({
    action: 'register-war-room',
    target: $('warRoomTargetContracts').value,
  }),
);

$('chainlistSearch').addEventListener('input', (e) => {
  chainlistQuery = e.target.value || '';
  renderChainlistResults();
});
$('useChainlistNetwork').addEventListener('click', () => {
  const item = chainlistItems.find((c) => c.chainId === selectedChainlistId);
  if (!item) {
    alert('Select a chain from the list first');
    return;
  }
  const rpcUrl = $('chainlistRpc').value;
  if (!rpcUrl) {
    alert('Pick an RPC');
    return;
  }
  void activateNetwork({
    chainId: item.chainId,
    rpcUrl,
    name: item.name,
    explorerUrl: item.explorerUrl,
    nativeCurrency: item.nativeCurrencySymbol,
    isTestnet: item.isTestnet,
  });
});
$('useManualNetwork').addEventListener('click', () => {
  const chainId = Number(($('manualChainId').value || '').trim());
  const rpcUrl = ($('manualRpcUrl').value || '').trim();
  const name = ($('manualChainName').value || '').trim();
  if (!Number.isFinite(chainId) || chainId <= 0) {
    alert('Enter a valid chainId');
    return;
  }
  if (!rpcUrl.startsWith('https://')) {
    alert('RPC must be https://');
    return;
  }
  void activateNetwork({
    chainId,
    rpcUrl,
    name: name || ('Chain ' + chainId),
    explorerUrl: '',
    nativeCurrency: 'ETH',
    isTestnet: false,
  });
});

$('clearLog').addEventListener('click', () => { logEl.textContent = ''; });
$('toggleLog').addEventListener('click', () => {
  shellEl.classList.toggle('log-collapsed');
  $('toggleLog').title = shellEl.classList.contains('log-collapsed') ? 'Expand log' : 'Collapse log';
});

const es = new EventSource('/api/run/stream');
es.addEventListener('log', (ev) => appendLog(ev.data));
es.addEventListener('start', (ev) => {
  setLogRunning(true);
  appendLog('--- start ' + ev.data + ' ---');
});
es.addEventListener('done', (ev) => {
  setLogRunning(false);
  appendLog('--- done ' + ev.data + ' ---');
  loadAll();
});
es.onerror = () => {};

loadAll();`;
}
