import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mock the global window and localStorage before importing the module
const mockStorage = new Map<string, string>();

interface MockLocalStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const mockLocalStorage: MockLocalStorage = {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => { mockStorage.set(key, value); },
  removeItem: (key: string) => { mockStorage.delete(key); },
};

// Set up the mock window object
globalThis.window = {
  localStorage: mockLocalStorage,
} as unknown as Window;

import { getPlatformState, savePlatformState } from '../../src/platform/dataSource.js';

const STORAGE_KEY = 'kansai-trip-navigator:r6:state';

test('getPlatformState returns seed state when key is missing', () => {
  mockStorage.clear();
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);
  if (result.state) {
    assert.ok(result.state.projects.length > 0);
    assert.ok(result.state.planItems.length > 0);
  }
  // Verify that the seed state was saved to storage
  const saved = mockStorage.get(STORAGE_KEY);
  assert.ok(saved);
});

test('getPlatformState returns error when data is corrupt and does not overwrite', () => {
  mockStorage.clear();
  // Set corrupt data
  const corruptData = 'invalid-json';
  mockStorage.set(STORAGE_KEY, corruptData);

  const result = getPlatformState();
  assert.ok(result.error);
  assert.match(result.error!, /데이터 손상 또는 유효하지 않음/);
  assert.equal(result.state, null);

  // Verify that the corrupt data was NOT overwritten
  const preserved = mockStorage.get(STORAGE_KEY);
  assert.equal(preserved, corruptData);
});

test('savePlatformState returns error when storage is unavailable', () => {
  // Temporarily remove window to simulate storage unavailability
  const originalWindow = globalThis.window;
  delete (globalThis as Record<string, unknown>).window;

  const result = savePlatformState({} as never);
  assert.ok(!result.ok);
  assert.equal(result.error, 'Storage unavailable');

  // Restore window
  globalThis.window = originalWindow;
});

test('getPlatformState returns saved state when storage has valid data', () => {
  mockStorage.clear();
  // First call to initialize seed
  const initial = getPlatformState();
  assert.ok(initial.state);

  // Modify the state and save it
  if (initial.state) {
    const modifiedState = {
      ...initial.state,
      projects: [...initial.state.projects, { id: 'new-project', workspaceId: 'ws1', title: 'New', timezone: 'UTC', status: 'planning' as const, visibility: 'private' as const }],
    };
    const saveResult = savePlatformState(modifiedState);
    assert.ok(saveResult.ok);

    // Now getPlatformState should return the modified state
    const loaded = getPlatformState();
    assert.equal(loaded.error, null);
    assert.ok(loaded.state);
    if (loaded.state) {
      assert.equal(loaded.state.projects.length, 2);
      assert.equal(loaded.state.projects[1].id, 'new-project');
    }
  }
});

test('fresh seed contains all price records with correct subject, type, and JPY totals', () => {
  mockStorage.clear();
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);

  if (result.state) {
    const costRecords = result.state.costRecords;
    assert.ok(Array.isArray(costRecords));

    const expectedIds = [
      'kamu-kix', 'aburiya', 'seizen', 'bajitofu', 'kyorinsen',
      'kanei', 'spice', 'rakukanki', 'quattro'
    ];

    // 9 JPY food seeds + 3 JPY lodging seeds (converted from KRW)
    assert.equal(costRecords.length, 12, `Expected 12 cost records, got ${costRecords.length}`);

    const jpyFoodIds = new Set(costRecords.filter(r => r.total.currency === 'JPY' && r.category === 'food').map(r => r.subject.id.replace('plan-item:', '')));
    for (const id of expectedIds) {
      assert.ok(jpyFoodIds.has(id), `Missing JPY food cost record for event id: ${id}`);
    }

    const jpyLodgingRecords = costRecords.filter(r => r.total.currency === 'JPY' && r.category === 'lodging');
    assert.equal(jpyLodgingRecords.length, 3, `Expected 3 JPY lodging records, got ${jpyLodgingRecords.length}`);

    // Verify lodging records are committed and have correct converted amount
    for (const record of jpyLodgingRecords) {
      assert.equal(record.type, 'committed', `Lodging record ${record.id} should be committed`);
      assert.equal(record.total.amount, 6383, `Lodging record ${record.id} should have amount 6383 JPY`);
      assert.ok(record.sourcePriceText, `Lodging record ${record.id} should have sourcePriceText`);
    }

    const foundIds = new Set(costRecords.map(r => r.subject.id.replace('plan-item:', '')));

    for (const id of expectedIds) {
      assert.ok(foundIds.has(id), `Missing cost record for event id: ${id}`);
    }

    // Verify specific properties for one record
    const kamuRecord = costRecords.find(r => r.subject.id === 'plan-item:kamu-kix');
    assert.ok(kamuRecord);
    if (kamuRecord) {
      assert.equal(kamuRecord.type, 'estimate');
      assert.equal(kamuRecord.total.currency, 'JPY');
      // Price was "약 ¥890" -> 890
      assert.equal(kamuRecord.total.amount, 890);

      // Check breakdown
      assert.ok(kamuRecord.breakdown);
      assert.equal(kamuRecord.breakdown.length, 1);
      assert.equal(kamuRecord.breakdown[0].type, 'custom');
      assert.equal(kamuRecord.breakdown[0].label, '맛있는 라멘(おいしいラーメン)');
      assert.equal(kamuRecord.sourcePriceText, '약 ¥890');
    }

    // Verify another record with range price
    const bajitoRecord = costRecords.find(r => r.subject.id === 'plan-item:bajitofu');
    assert.ok(bajitoRecord);
    if (bajitoRecord) {
      // Price was "¥2,500~3,500"
      // parsePriceToAmount matches /¥\s*([0-9][0-9,]*)/
      // It will match "2,500"
      assert.equal(bajitoRecord.total.amount, 2500);
      // First split menu label check (full breakdown verified in dedicated test)
      assert.equal(bajitoRecord.breakdown[0].label, 'もも (2 skewers)');
      assert.equal(bajitoRecord.sourcePriceText, '¥2,500~3,500');

      // Check estimate range
      assert.ok(bajitoRecord.estimateRange);
      if (bajitoRecord.estimateRange) {
        assert.equal(bajitoRecord.estimateRange.min.amount, 2500);
        assert.equal(bajitoRecord.estimateRange.max.amount, 3500);
      }
    }
  }
});

test('existing saved R6 state with no costs is enriched and persisted', () => {
  mockStorage.clear();

  // Initialize seed to get valid state structure
  const initial = getPlatformState();
  assert.ok(initial.state);

  if (initial.state) {
    // Save state with empty costRecords to simulate existing state without costs
    const stateWithoutCosts = {
      ...initial.state,
      costRecords: []
    };
    const saveResult = savePlatformState(stateWithoutCosts);
    assert.ok(saveResult.ok);

    // Load again, should be enriched with cost records
    const result = getPlatformState();
    assert.equal(result.error, null);
    assert.ok(result.state);

    if (result.state) {
      // Should have 12 cost records (9 JPY food + 3 JPY lodging)
      assert.equal(result.state.costRecords.length, 12);

      // Verify specific record
      const kamuRecord = result.state.costRecords.find(r => r.id === 'cost_seed_kamu-kix');
      assert.ok(kamuRecord);
      if (kamuRecord) {
        assert.equal(kamuRecord.subject.id, 'plan-item:kamu-kix');
        assert.equal(kamuRecord.type, 'estimate');
        assert.equal(kamuRecord.total.amount, 890);
        assert.equal(kamuRecord.breakdown[0].label, '맛있는 라멘(おいしいラーメン)');
        assert.equal(kamuRecord.sourcePriceText, '약 ¥890');
      }
    }

    // Verify it was persisted correctly
    const savedRaw = mockStorage.get(STORAGE_KEY);
    assert.ok(savedRaw);
    const savedState = JSON.parse(savedRaw);
    assert.equal(savedState.data.costRecords.length, 12);
  }
});

test('user-added cost record is preserved and no duplicates on repeated load', () => {
  mockStorage.clear();

  // Initialize seed
  const initial = getPlatformState();
  assert.ok(initial.state);

  if (initial.state) {
    // Add a user cost record
    const userRecord = {
      id: 'cost_user_1',
      projectId: initial.state.projects[0].id,
      subject: { type: 'planItem', id: 'plan-item:kamu-kix' },
      type: 'actual',
      category: 'food',
      total: { amount: 1000, currency: 'JPY' },
    };

    const modifiedState = {
      ...initial.state,
      costRecords: [...initial.state.costRecords, userRecord],
    };

    savePlatformState(modifiedState);

    // Load again
    const loaded = getPlatformState();
    assert.equal(loaded.error, null);
    assert.ok(loaded.state);

    if (loaded.state) {
      // Should have the original seed records + the user record
      const userRecords = loaded.state.costRecords.filter(r => r.id === 'cost_user_1');
      assert.equal(userRecords.length, 1);

      // Check for duplicates of the seed record for kamu-kix
      const kamuSeedRecords = loaded.state.costRecords.filter(r => r.id === 'cost_seed_kamu-kix');
      assert.equal(kamuSeedRecords.length, 1);

      // Total count should be initial seed count + 1
      const initialCount = initial.state.costRecords.length;
      assert.equal(loaded.state.costRecords.length, initialCount + 1);
    }
  }
});

test('legacy seed records with old price-only breakdown are upgraded to menu labels', () => {
  mockStorage.clear();

  // Initialize seed to get valid state structure
  const initial = getPlatformState();
  assert.ok(initial.state);

  if (initial.state) {
    // Create a state with an old-style seed record (price as label)
    const oldStyleRecord = {
      id: 'cost_seed_kamu-kix',
      projectId: initial.state.projects[0].id,
      subject: { type: 'planItem', id: 'plan-item:kamu-kix' },
      type: 'estimate',
      category: 'food',
      total: { amount: 890, currency: 'JPY' },
      breakdown: [
        {
          type: 'custom',
          label: '약 ¥890', // Old style: price as label
          amount: { amount: 890, currency: 'JPY' }
        }
      ],
      // No sourcePriceText, no estimateRange
    };

    const stateWithOldRecord = {
      ...initial.state,
      costRecords: [oldStyleRecord]
    };

    const saveResult = savePlatformState(stateWithOldRecord);
    assert.ok(saveResult.ok);

    // Load again, should be upgraded
    const result = getPlatformState();
    assert.equal(result.error, null);
    assert.ok(result.state);

    if (result.state) {
      const upgradedRecord = result.state.costRecords.find(r => r.id === 'cost_seed_kamu-kix');
      assert.ok(upgradedRecord);
      if (upgradedRecord) {
        // Single KAMU label still works
        assert.equal(upgradedRecord.breakdown[0].label, '맛있는 라멘(おいしいラーメン)');
        assert.equal(upgradedRecord.sourcePriceText, '약 ¥890');
      }
    }
  }
});

test('Seizen breakdown is two distinct lines 2800+400=3200', () => {
  mockStorage.clear();
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);

  if (result.state) {
    const seizenRecord = result.state.costRecords.find(r => r.subject.id === 'plan-item:seizen');
    assert.ok(seizenRecord, 'Seizen record not found');

    if (seizenRecord) {
      assert.equal(seizenRecord.total.amount, 3200);
      assert.equal(seizenRecord.total.currency, 'JPY');
      assert.ok(seizenRecord.breakdown);
      assert.equal(seizenRecord.breakdown.length, 2);

      const labels = seizenRecord.breakdown.map(b => b.label);
      assert.ok(labels.includes('枝枯らし熟成ロースかつ定食 150g'), 'Missing Seizen main dish label');
      assert.ok(labels.includes('特別メンチ'), 'Missing Seizen side dish label');

      const amounts = seizenRecord.breakdown.map(b => b.amount.amount);
      assert.ok(amounts.includes(2800), 'Missing Seizen main dish amount');
      assert.ok(amounts.includes(400), 'Missing Seizen side dish amount');

      const sum = amounts.reduce((a, b) => a + b, 0);
      assert.equal(sum, 3200);
    }
  }
});

test('Kanei breakdown is two distinct lines 1300+600=1900', () => {
  mockStorage.clear();
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);

  if (result.state) {
    const kaneiRecord = result.state.costRecords.find(r => r.subject.id === 'plan-item:kanei');
    assert.ok(kaneiRecord, 'Kanei record not found');

    if (kaneiRecord) {
      assert.equal(kaneiRecord.total.amount, 1900);
      assert.equal(kaneiRecord.total.currency, 'JPY');
      assert.ok(kaneiRecord.breakdown);
      assert.equal(kaneiRecord.breakdown.length, 2);

      const labels = kaneiRecord.breakdown.map(b => b.label);
      assert.ok(labels.includes('辛味大根おろしそば'), 'Missing Kanei soba label');
      assert.ok(labels.includes('そば豆腐'), 'Missing Kanei tofu label');

      const amounts = kaneiRecord.breakdown.map(b => b.amount.amount);
      assert.ok(amounts.includes(1300), 'Missing Kanei soba amount');
      assert.ok(amounts.includes(600), 'Missing Kanei tofu amount');

      const sum = amounts.reduce((a, b) => a + b, 0);
      assert.equal(sum, 1900);
    }
  }
});

test('Rakkanki breakdown has four sourced lines + 800 budget line sum 2880', () => {
  mockStorage.clear();
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);

  if (result.state) {
    const rakkankiRecord = result.state.costRecords.find(r => r.subject.id === 'plan-item:rakukanki');
    assert.ok(rakkankiRecord, 'Rakkanki record not found');

    if (rakkankiRecord) {
      assert.equal(rakkankiRecord.total.amount, 2880);
      assert.equal(rakkankiRecord.total.currency, 'JPY');
      assert.ok(rakkankiRecord.breakdown);
      assert.equal(rakkankiRecord.breakdown.length, 5);

      const labels = rakkankiRecord.breakdown.map(b => b.label);
      assert.ok(labels.includes('小籠包5個'), 'Missing Rakkanki xiaolongbao label');
      assert.ok(labels.includes('むし鶏 small'), 'Missing Rakkanki chicken label');
      assert.ok(labels.includes('殻付きホタテのガーリック蒸し'), 'Missing Rakkanki scallop label');
      assert.ok(labels.includes('有頭エビのガーリック蒸し'), 'Missing Rakkanki shrimp label');
      assert.ok(labels.includes('추가 주문 여유 예산'), 'Missing Rakkanki budget buffer label');

      const amounts = rakkankiRecord.breakdown.map(b => b.amount.amount);
      assert.ok(amounts.includes(680), 'Missing Rakkanki xiaolongbao amount');
      assert.ok(amounts.includes(550), 'Missing Rakkanki chicken amount');
      assert.ok(amounts.includes(500), 'Missing Rakkanki scallop amount');
      assert.ok(amounts.includes(350), 'Missing Rakkanki shrimp amount');
      assert.ok(amounts.includes(800), 'Missing Rakkanki budget buffer amount');

      const sum = amounts.reduce((a, b) => a + b, 0);
      assert.equal(sum, 2880);
    }
  }
});

test('Bajitofu breakdown has five estimated menu lines + 490 budget line sum 2500 with estimateRange 2500..3500', () => {
  mockStorage.clear();
  const result = getPlatformState();
  assert.equal(result.error, null);
  assert.ok(result.state);

  if (result.state) {
    const bajitofuRecord = result.state.costRecords.find(r => r.subject.id === 'plan-item:bajitofu');
    assert.ok(bajitofuRecord, 'Bajitofu record not found');

    if (bajitofuRecord) {
      assert.equal(bajitofuRecord.total.amount, 2500);
      assert.equal(bajitofuRecord.total.currency, 'JPY');
      assert.ok(bajitofuRecord.breakdown);
      assert.equal(bajitofuRecord.breakdown.length, 6);

      const labels = bajitofuRecord.breakdown.map(b => b.label);
      assert.ok(labels.includes('もも (2 skewers)'), 'Missing Bajitofu thigh label');
      assert.ok(labels.includes('せせり (2 skewers)'), 'Missing Bajitofu tendon label');
      assert.ok(labels.includes('ねぎま (2 skewers)'), 'Missing Bajitofu negima label');
      assert.ok(labels.includes('つくね (2 skewers)'), 'Missing Bajitofu tsukune label');
      assert.ok(labels.includes('手羽先 (2 skewers)'), 'Missing Bajitofu wing label');
      assert.ok(labels.includes('추가 주문 여유 예산'), 'Missing Bajitofu budget buffer label');

      const amounts = bajitofuRecord.breakdown.map(b => b.amount.amount);
      assert.ok(amounts.includes(380), 'Missing Bajitofu thigh amount');
      assert.ok(amounts.includes(490), 'Missing Bajitofu tsukune amount');

      const sum = amounts.reduce((a, b) => a + b, 0);
      assert.equal(sum, 2500);

      assert.ok(bajitofuRecord.estimateRange);
      if (bajitofuRecord.estimateRange) {
        assert.equal(bajitofuRecord.estimateRange.min.amount, 2500);
        assert.equal(bajitofuRecord.estimateRange.max.amount, 3500);
      }
    }
  }
});

test('existing persisted prior single-menu generated seed records upgrade safely', () => {
  mockStorage.clear();

  // Initialize seed to get valid state structure
  const initial = getPlatformState();
  assert.ok(initial.state);

  if (initial.state) {
    // Create a state with an old-style seed record for Seizen (price as label)
    const oldStyleSeizenRecord = {
      id: 'cost_seed_seizen',
      projectId: initial.state.projects[0].id,
      subject: { type: 'planItem', id: 'plan-item:seizen' },
      type: 'estimate',
      category: 'food',
      total: { amount: 3200, currency: 'JPY' },
      breakdown: [
        {
          type: 'custom',
          label: '약 ¥3,200', // Old style: price as label
          amount: { amount: 3200, currency: 'JPY' }
        }
      ],
      // No sourcePriceText, no estimateRange
    };

    const stateWithOldRecord = {
      ...initial.state,
      costRecords: [oldStyleSeizenRecord]
    };

    const saveResult = savePlatformState(stateWithOldRecord);
    assert.ok(saveResult.ok);

    // Load again, should be upgraded
    const result = getPlatformState();
    assert.equal(result.error, null);
    assert.ok(result.state);

    if (result.state) {
      const upgradedRecord = result.state.costRecords.find(r => r.id === 'cost_seed_seizen');
      assert.ok(upgradedRecord);
      if (upgradedRecord) {
        // Expect two lines: 2800 and 400, sum 3200
        assert.equal(upgradedRecord.breakdown.length, 2);
        const amounts = upgradedRecord.breakdown.map(b => b.amount.amount);
        assert.ok(amounts.includes(2800));
        assert.ok(amounts.includes(400));
        assert.equal(amounts.reduce((a, b) => a + b, 0), 3200);
        assert.equal(upgradedRecord.sourcePriceText, '약 ¥3,200');
      }
    }
  }
});

test('user-modified records remain untouched', () => {
  mockStorage.clear();

  // Initialize seed
  const initial = getPlatformState();
  assert.ok(initial.state);

  if (initial.state) {
    // Find the Seizen record and modify it
    const seizenRecord = initial.state.costRecords.find(r => r.id === 'cost_seed_seizen');
    assert.ok(seizenRecord);

    if (seizenRecord) {
      // Modify the record to simulate user changes
      const modifiedRecord = {
        ...seizenRecord,
        total: { amount: 4000, currency: 'JPY' },
        breakdown: [
          {
            type: 'custom',
            label: 'User Modified Item',
            amount: { amount: 4000, currency: 'JPY' }
          }
        ]
      };

      const modifiedState = {
        ...initial.state,
        costRecords: initial.state.costRecords.map(r => r.id === 'cost_seed_seizen' ? modifiedRecord : r)
      };

      savePlatformState(modifiedState);

      // Load again
      const loaded = getPlatformState();
      assert.equal(loaded.error, null);
      assert.ok(loaded.state);

      if (loaded.state) {
        const loadedSeizenRecord = loaded.state.costRecords.find(r => r.id === 'cost_seed_seizen');
        assert.ok(loadedSeizenRecord);

        if (loadedSeizenRecord) {
          // Should retain user modifications
          assert.equal(loadedSeizenRecord.total.amount, 4000);
          assert.equal(loadedSeizenRecord.breakdown[0].label, 'User Modified Item');
        }
      }
    }
  }
});

test('repeated load idempotent', () => {
  mockStorage.clear();

  // First load
  const firstLoad = getPlatformState();
  assert.equal(firstLoad.error, null);
  assert.ok(firstLoad.state);

  if (firstLoad.state) {
    const firstStateJson = JSON.stringify(firstLoad.state);

    // Second load
    const secondLoad = getPlatformState();
    assert.equal(secondLoad.error, null);
    assert.ok(secondLoad.state);

    if (secondLoad.state) {
      const secondStateJson = JSON.stringify(secondLoad.state);

      // States should be identical
      assert.equal(firstStateJson, secondStateJson);
    }
  }
});