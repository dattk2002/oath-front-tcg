"""Independently pinned original gameplay coverage. New campaign scope is additive."""
REQUIRED_COMPONENTS = {
    'shell_home': {
        'app/App.tsx#App',
        'app/layout.tsx#Layout',
    },
    'hero_roster': {
        'features/hero/HeroSelect.tsx#HeroSelect',
        'features/hero/HeroInspect.tsx#HeroInspect',
    },
    'decks_collection': {
        'features/deck/DeckScreen.tsx#DeckScreen',
        'features/deck/DeckList.tsx#DeckList',
        'features/deck/DeckBuilder.tsx#DeckBuilder',
        'features/deck/CardCollection.tsx#CardCollection',
        'features/deck/CardCollection.tsx#QuantityControls',
        'features/deck/ManaCurve.tsx#ManaCurve',
    },
    'setup': {
        'features/setup/PresetSetup.tsx#PresetSetup',
    },
    'mulligan': {
        'features/match/MatchScreen.tsx#MatchScreen',
        'features/match/Hand.tsx#Hand',
    },
    'battle': {
        'features/match/MatchScreen.tsx#MatchScreen',
        'features/match/MatchShell.tsx#MatchShell',
        'features/match/Board.tsx#Board',
        'features/match/HeroPanel.tsx#HeroPanel',
        'features/match/Hand.tsx#Hand',
        'features/match/PhaseControl.tsx#PhaseControl',
        'features/match/BattleScene.tsx#BattleScene',
    },
    'inspect_log': {
        'features/match/InspectPanel.tsx#InspectPanel',
        'features/match/BattleLog.tsx#BattleLog',
        'features/match/ArtImage.tsx#ArtImage',
    },
    'block_response': {
        'features/match/BlockResponse.tsx#BlockResponse',
    },
    'pause_recovery': {
        'features/match/PauseDialog.tsx#PauseDialog',
        'features/match/RecoveryControls.tsx#RecoveryControls',
        'features/auth/SessionRecovery.tsx#SessionRecovery',
    },
    'results_history': {
        'features/match/ResultDialog.tsx#ResultDialog',
        'features/match/ResultDialog.tsx#ResultDetail',
        'features/history/HistoryScreen.tsx#HistoryScreen',
    },
    'settings_tutorial': {
        'features/settings/SettingsDialog.tsx#SettingsDialog',
        'features/tutorial/TutorialOverlay.tsx#TutorialOverlay',
        'features/tutorial/tutorial-controller.tsx#TutorialEntry',
    },
    'auth': {
        'features/auth/AuthPanel.tsx#AuthPanel',
        'features/auth/MergeConflictDialog.tsx#MergeConflictDialog',
        'features/auth/SessionRecovery.tsx#SessionRecovery',
    },
}

REQUIRED_RESPONSIVE = {'mobile', 'compact', 'desktop', 'reflow'}
