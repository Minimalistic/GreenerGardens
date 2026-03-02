import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';

/**
 * Seeds the database with realistic mid-use test data:
 * 2 gardens, multiple plots/sub-plots, plant instances in various stages,
 * harvests, notes, tasks, pest events, soil tests, seed inventory,
 * and sample chat conversations.
 */
export function seedTestData(db: Database.Database) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const today = new Date().toISOString().slice(0, 10);

  // Helper to get a date N days ago
  function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  // Helper to get a date N days from now
  function daysFromNow(n: number) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // Look up plant catalog entries by name
  function findPlant(name: string): string | null {
    const row = db.prepare(
      'SELECT id FROM plant_catalog WHERE LOWER(common_name) = LOWER(?)'
    ).get(name) as { id: string } | undefined;
    return row?.id ?? null;
  }

  const seed = db.transaction(() => {
    // ─── Gardens ───
    const garden1Id = uuid();
    const garden2Id = uuid();

    db.prepare(`INSERT INTO gardens (id, name, description, address, latitude, longitude, usda_zone, timezone, last_frost_date, first_frost_date, total_area_sqft, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      garden1Id, 'Sunny Acres Backyard', 'Our main backyard garden with raised beds, herb spiral, and container plantings.',
      '1234 Garden Lane, Richmond, VA 23220', 37.5407, -77.4360, '7b', 'America/New_York',
      '04-15', '10-20', 800, '{}', daysAgo(120) + ' 10:00:00', now
    );

    db.prepare(`INSERT INTO gardens (id, name, description, address, latitude, longitude, usda_zone, timezone, last_frost_date, first_frost_date, total_area_sqft, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      garden2Id, 'Community Garden Plot #12', 'Shared community garden space - two 10x10 beds.',
      '500 Community Dr, Richmond, VA 23221', 37.5530, -77.4780, '7b', 'America/New_York',
      '04-15', '10-20', 200, '{}', daysAgo(90) + ' 10:00:00', now
    );

    // ─── Plots for Garden 1 ───
    const plot1Id = uuid(); // Main Raised Bed
    const plot2Id = uuid(); // Herb Spiral
    const plot3Id = uuid(); // Tomato Row
    const plot4Id = uuid(); // Container Corner

    const plotInsert = db.prepare(`INSERT INTO plots (id, garden_id, name, plot_type, dimensions_json, geometry_json, soil_type, sun_exposure, irrigation, notes, is_covered, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    plotInsert.run(plot1Id, garden1Id, 'Main Raised Bed', 'raised_bed',
      JSON.stringify({ width: 4, length: 8, height: 1, unit: 'ft' }),
      JSON.stringify({ x: 100, y: 100, width: 200, height: 400, rotation: 0 }),
      'loamy', 'full_sun', 'drip', 'Built last spring with cedar boards. Filled with garden mix.', 0,
      JSON.stringify(['vegetables', 'main']), daysAgo(120) + ' 10:00:00', now);

    plotInsert.run(plot2Id, garden1Id, 'Herb Spiral', 'raised_bed',
      JSON.stringify({ width: 4, length: 4, height: 1.5, unit: 'ft' }),
      JSON.stringify({ x: 350, y: 100, width: 200, height: 200, rotation: 0 }),
      'sandy_loam', 'full_sun', 'hand', 'Spiral herb garden near the kitchen door.', 0,
      JSON.stringify(['herbs']), daysAgo(120) + ' 10:00:00', now);

    plotInsert.run(plot3Id, garden1Id, 'Tomato Row', 'in_ground',
      JSON.stringify({ width: 3, length: 12, unit: 'ft' }),
      JSON.stringify({ x: 100, y: 550, width: 600, height: 150, rotation: 0 }),
      'clay_loam', 'full_sun', 'soaker_hose', 'Along the south fence line. Gets full afternoon sun.', 0,
      JSON.stringify(['tomatoes']), daysAgo(100) + ' 10:00:00', now);

    plotInsert.run(plot4Id, garden1Id, 'Container Corner', 'container',
      JSON.stringify({ width: 6, length: 6, unit: 'ft' }),
      JSON.stringify({ x: 350, y: 350, width: 300, height: 300, rotation: 0 }),
      'potting_mix', 'partial_sun', 'hand', 'Patio containers - peppers, strawberries, and flowers.', 0,
      JSON.stringify(['containers', 'patio']), daysAgo(80) + ' 10:00:00', now);

    // ─── Plots for Garden 2 ───
    const plot5Id = uuid(); // Veggie Plot
    const plot6Id = uuid(); // Greens Plot

    plotInsert.run(plot5Id, garden2Id, 'Plot A - Veggies', 'in_ground',
      JSON.stringify({ width: 10, length: 10, unit: 'ft' }),
      JSON.stringify({ x: 50, y: 50, width: 400, height: 400, rotation: 0 }),
      'loamy', 'full_sun', 'overhead', 'Main vegetable production area.', 0,
      JSON.stringify(['vegetables']), daysAgo(90) + ' 10:00:00', now);

    plotInsert.run(plot6Id, garden2Id, 'Plot B - Greens', 'in_ground',
      JSON.stringify({ width: 6, length: 6, unit: 'ft' }),
      JSON.stringify({ x: 50, y: 500, width: 250, height: 250, rotation: 0 }),
      'loamy', 'partial_shade', 'overhead', 'Shaded area for leafy greens.', 0,
      JSON.stringify(['greens', 'leafy']), daysAgo(90) + ' 10:00:00', now);

    // ─── Sub-plots ───
    const subPlotInsert = db.prepare(`INSERT INTO sub_plots (id, plot_id, grid_row, grid_col, plant_instance_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);

    // Main Raised Bed - 4x4 grid (4x8ft bed, ~1 sq ft per cell)
    const subPlotIds: string[] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const spId = uuid();
        subPlotIds.push(spId);
        subPlotInsert.run(spId, plot1Id, row, col, null, daysAgo(120) + ' 10:00:00', now);
      }
    }

    // Herb Spiral - 3x3 grid (4x4ft circular, inner cells)
    const herbSubPlotIds: string[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const spId = uuid();
        herbSubPlotIds.push(spId);
        subPlotInsert.run(spId, plot2Id, row, col, null, daysAgo(120) + ' 10:00:00', now);
      }
    }

    // Tomato Row - 1x6 grid (3x12ft row, 2ft spacing)
    const tomatoSubPlotIds: string[] = [];
    for (let col = 0; col < 6; col++) {
      const spId = uuid();
      tomatoSubPlotIds.push(spId);
      subPlotInsert.run(spId, plot3Id, 0, col, null, daysAgo(100) + ' 10:00:00', now);
    }

    // Container Corner - 2x3 grid (6x6ft patio, one container per cell)
    const containerSubPlotIds: string[] = [];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const spId = uuid();
        containerSubPlotIds.push(spId);
        subPlotInsert.run(spId, plot4Id, row, col, null, daysAgo(80) + ' 10:00:00', now);
      }
    }

    // Plot A - Veggies (community garden) - 4x4 grid (10x10ft)
    const plotASubPlotIds: string[] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const spId = uuid();
        plotASubPlotIds.push(spId);
        subPlotInsert.run(spId, plot5Id, row, col, null, daysAgo(90) + ' 10:00:00', now);
      }
    }

    // Plot B - Greens (community garden) - 3x3 grid (6x6ft)
    const plotBSubPlotIds: string[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const spId = uuid();
        plotBSubPlotIds.push(spId);
        subPlotInsert.run(spId, plot6Id, row, col, null, daysAgo(90) + ' 10:00:00', now);
      }
    }

    // ─── Plant Instances ───
    const piInsert = db.prepare(`INSERT INTO plant_instances (id, plant_catalog_id, plot_id, sub_plot_id, variety_name, status, health, planting_method, date_planted, date_germinated, date_transplanted, date_first_harvest, date_finished, quantity, source, notes, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    const tomatoId = findPlant('Tomato');
    const basilId = findPlant('Basil');
    const pepperBellId = findPlant('Bell Pepper') ?? findPlant('Pepper');
    const lettId = findPlant('Lettuce');
    const cucId = findPlant('Cucumber');
    const zuccId = findPlant('Zucchini') ?? findPlant('Summer Squash');
    const carrotId = findPlant('Carrot');
    const kaleId = findPlant('Kale');
    const spinachId = findPlant('Spinach');
    const rosemaryId = findPlant('Rosemary');
    const thymeId = findPlant('Thyme');
    const mintId = findPlant('Mint');
    const strawberryId = findPlant('Strawberry');
    const beanId = findPlant('Green Bean') ?? findPlant('Bush Bean') ?? findPlant('Bean');
    const radishId = findPlant('Radish');
    const snapPeaId = findPlant('Snap Pea') ?? findPlant('Pea');
    const chiveId = findPlant('Chives') ?? findPlant('Chive');
    const cilantroId = findPlant('Cilantro') ?? findPlant('Coriander');
    const oreganoId = findPlant('Oregano');
    const parsleyId = findPlant('Parsley');
    const jalapenoId = findPlant('Jalapeño') ?? findPlant('Jalapeno') ?? findPlant('Hot Pepper');
    const swissChardId = findPlant('Swiss Chard') ?? findPlant('Chard');
    const onionId = findPlant('Onion') ?? findPlant('Green Onion');
    const beetId = findPlant('Beet') ?? findPlant('Beetroot');

    // Instances array: [id, catalogId, plotId, subPlotId, variety, status, health, method, planted, germinated, transplanted, firstHarvest, finished, qty, source, notes, tags]
    const instances: Array<{
      id: string; catalogId: string | null; plotId: string; subPlotId: string | null;
      variety: string; status: string; health: string; method: string;
      planted: string | null; germinated: string | null; transplanted: string | null;
      firstHarvest: string | null; finished: string | null;
      qty: number; source: string; notes: string; tags: string[];
    }> = [];

    // Garden 1 - Tomato Row (linked to tomatoSubPlotIds)
    const pi1 = uuid();
    instances.push({ id: pi1, catalogId: tomatoId, plotId: plot3Id, subPlotId: tomatoSubPlotIds[0], variety: 'Cherokee Purple', status: 'harvesting', health: 'good', method: 'transplant', planted: daysAgo(75), germinated: daysAgo(70), transplanted: daysAgo(55), firstHarvest: daysAgo(10), finished: null, qty: 4, source: 'Local nursery', notes: 'Great producers this year! Staked with 6ft cages.', tags: ['heirloom'] });

    const pi2 = uuid();
    instances.push({ id: pi2, catalogId: tomatoId, plotId: plot3Id, subPlotId: tomatoSubPlotIds[2], variety: 'Sun Gold Cherry', status: 'harvesting', health: 'good', method: 'transplant', planted: daysAgo(75), germinated: daysAgo(70), transplanted: daysAgo(55), firstHarvest: daysAgo(14), finished: null, qty: 3, source: 'Seed started indoors', notes: 'Producing like crazy. Kids love them.', tags: ['cherry'] });

    const pi3 = uuid();
    instances.push({ id: pi3, catalogId: tomatoId, plotId: plot3Id, subPlotId: tomatoSubPlotIds[4], variety: 'Roma', status: 'growing', health: 'fair', method: 'transplant', planted: daysAgo(60), germinated: null, transplanted: daysAgo(45), firstHarvest: null, finished: null, qty: 4, source: 'Big box store', notes: 'Some blossom end rot early on. Added calcium.', tags: ['paste'] });

    // Garden 1 - Main Raised Bed
    const pi4 = uuid();
    instances.push({ id: pi4, catalogId: cucId, plotId: plot1Id, subPlotId: subPlotIds[0], variety: 'Marketmore 76', status: 'harvesting', health: 'good', method: 'direct_sow', planted: daysAgo(65), germinated: daysAgo(58), transplanted: null, firstHarvest: daysAgo(7), finished: null, qty: 3, source: 'Saved seed', notes: 'Growing on trellis at the north end.', tags: [] });

    const pi5 = uuid();
    instances.push({ id: pi5, catalogId: zuccId, plotId: plot1Id, subPlotId: subPlotIds[4], variety: 'Black Beauty', status: 'harvesting', health: 'good', method: 'direct_sow', planted: daysAgo(60), germinated: daysAgo(53), transplanted: null, firstHarvest: daysAgo(5), finished: null, qty: 2, source: 'Seed packet', notes: 'Already giving away zucchini to neighbors!', tags: [] });

    const pi6 = uuid();
    instances.push({ id: pi6, catalogId: carrotId, plotId: plot1Id, subPlotId: subPlotIds[8], variety: 'Nantes', status: 'growing', health: 'good', method: 'direct_sow', planted: daysAgo(50), germinated: daysAgo(40), transplanted: null, firstHarvest: null, finished: null, qty: 30, source: 'Seed packet', notes: 'Thinned to 2 inch spacing.', tags: [] });

    const pi7 = uuid();
    instances.push({ id: pi7, catalogId: beanId, plotId: plot1Id, subPlotId: subPlotIds[12], variety: 'Provider', status: 'growing', health: 'good', method: 'direct_sow', planted: daysAgo(40), germinated: daysAgo(33), transplanted: null, firstHarvest: null, finished: null, qty: 20, source: 'Seed packet', notes: 'Bush variety. Should start producing soon.', tags: [] });

    // Garden 1 - Herb Spiral (linked to herbSubPlotIds)
    const pi8 = uuid();
    instances.push({ id: pi8, catalogId: basilId, plotId: plot2Id, subPlotId: herbSubPlotIds[1], variety: 'Genovese', status: 'harvesting', health: 'good', method: 'transplant', planted: daysAgo(55), germinated: null, transplanted: daysAgo(45), firstHarvest: daysAgo(20), finished: null, qty: 4, source: 'Nursery start', notes: 'Pinching flowers weekly. Making pesto!', tags: [] });

    const pi9 = uuid();
    instances.push({ id: pi9, catalogId: rosemaryId, plotId: plot2Id, subPlotId: herbSubPlotIds[0], variety: 'Tuscan Blue', status: 'planted', health: 'good', method: 'transplant', planted: daysAgo(100), germinated: null, transplanted: daysAgo(100), firstHarvest: null, finished: null, qty: 1, source: 'Nursery', notes: 'Perennial. Coming back strong from last year.', tags: ['perennial'] });

    const pi10 = uuid();
    instances.push({ id: pi10, catalogId: thymeId, plotId: plot2Id, subPlotId: herbSubPlotIds[3], variety: 'English', status: 'planted', health: 'good', method: 'transplant', planted: daysAgo(100), germinated: null, transplanted: daysAgo(100), firstHarvest: null, finished: null, qty: 2, source: 'Division from neighbor', notes: 'Spreading nicely between the stones.', tags: ['perennial'] });

    const pi11 = uuid();
    instances.push({ id: pi11, catalogId: mintId, plotId: plot2Id, subPlotId: herbSubPlotIds[8], variety: 'Spearmint', status: 'planted', health: 'good', method: 'transplant', planted: daysAgo(80), germinated: null, transplanted: daysAgo(80), firstHarvest: null, finished: null, qty: 1, source: 'Gift from friend', notes: 'Contained in a buried pot to prevent spreading.', tags: ['perennial'] });

    // Garden 1 - Container Corner (linked to containerSubPlotIds)
    const pi12 = uuid();
    instances.push({ id: pi12, catalogId: pepperBellId, plotId: plot4Id, subPlotId: containerSubPlotIds[0], variety: 'California Wonder', status: 'growing', health: 'good', method: 'transplant', planted: daysAgo(65), germinated: null, transplanted: daysAgo(50), firstHarvest: null, finished: null, qty: 3, source: 'Nursery', notes: 'In 5-gallon grow bags. Fruits setting well.', tags: [] });

    const pi13 = uuid();
    instances.push({ id: pi13, catalogId: strawberryId, plotId: plot4Id, subPlotId: containerSubPlotIds[2], variety: 'Seascape', status: 'harvesting', health: 'good', method: 'transplant', planted: daysAgo(90), germinated: null, transplanted: daysAgo(90), firstHarvest: daysAgo(30), finished: null, qty: 12, source: 'Bare root - online', notes: 'Day-neutral everbearing. Producing steadily.', tags: ['everbearing'] });

    // Garden 1 - Main Raised Bed (additional plants to fill sub-plots)
    const pi20 = uuid();
    instances.push({ id: pi20, catalogId: lettId, plotId: plot1Id, subPlotId: subPlotIds[1], variety: 'Red Romaine', status: 'harvesting', health: 'good', method: 'direct_sow', planted: daysAgo(40), germinated: daysAgo(34), transplanted: null, firstHarvest: daysAgo(8), finished: null, qty: 8, source: 'Seed packet', notes: 'Cut-and-come-again harvesting working well.', tags: ['succession'] });

    const pi21 = uuid();
    instances.push({ id: pi21, catalogId: swissChardId, plotId: plot1Id, subPlotId: subPlotIds[3], variety: 'Rainbow', status: 'growing', health: 'good', method: 'direct_sow', planted: daysAgo(45), germinated: daysAgo(37), transplanted: null, firstHarvest: null, finished: null, qty: 6, source: 'Seed packet', notes: 'Beautiful multicolored stems. Almost ready for first harvest.', tags: [] });

    const pi22 = uuid();
    instances.push({ id: pi22, catalogId: onionId, plotId: plot1Id, subPlotId: subPlotIds[5], variety: 'Yellow Sweet Spanish', status: 'growing', health: 'good', method: 'transplant', planted: daysAgo(70), germinated: null, transplanted: daysAgo(70), firstHarvest: null, finished: null, qty: 12, source: 'Onion sets from garden center', notes: 'Bulbing up nicely. Will harvest when tops fall over.', tags: [] });

    const pi23 = uuid();
    instances.push({ id: pi23, catalogId: snapPeaId, plotId: plot1Id, subPlotId: subPlotIds[6], variety: 'Sugar Snap', status: 'finished', health: 'good', method: 'direct_sow', planted: daysAgo(100), germinated: daysAgo(92), transplanted: null, firstHarvest: daysAgo(55), finished: daysAgo(30), qty: 15, source: 'Seed packet', notes: 'Great spring crop. Pulled after heat set in. Space replanted.', tags: [] });

    const pi24 = uuid();
    instances.push({ id: pi24, catalogId: beetId, plotId: plot1Id, subPlotId: subPlotIds[9], variety: 'Detroit Dark Red', status: 'growing', health: 'good', method: 'direct_sow', planted: daysAgo(42), germinated: daysAgo(34), transplanted: null, firstHarvest: null, finished: null, qty: 10, source: 'Seed packet', notes: 'Thinned to 3-inch spacing. Greens look healthy.', tags: [] });

    const pi25 = uuid();
    instances.push({ id: pi25, catalogId: spinachId, plotId: plot1Id, subPlotId: subPlotIds[10], variety: 'Bloomsdale', status: 'finished', health: 'fair', method: 'direct_sow', planted: daysAgo(85), germinated: daysAgo(78), transplanted: null, firstHarvest: daysAgo(55), finished: daysAgo(35), qty: 12, source: 'Seed packet', notes: 'Bolted in early heat wave. Got 3 good harvests before that.', tags: [] });

    const pi26 = uuid();
    instances.push({ id: pi26, catalogId: radishId, plotId: plot1Id, subPlotId: subPlotIds[13], variety: 'French Breakfast', status: 'growing', health: 'good', method: 'direct_sow', planted: daysAgo(12), germinated: daysAgo(8), transplanted: null, firstHarvest: null, finished: null, qty: 20, source: 'Seed packet', notes: 'Second succession. Should be ready in about 2 weeks.', tags: ['succession'] });

    // Garden 1 - Herb Spiral (additional herbs with sub-plot links)
    const pi27 = uuid();
    instances.push({ id: pi27, catalogId: cilantroId, plotId: plot2Id, subPlotId: herbSubPlotIds[7], variety: 'Slow Bolt', status: 'growing', health: 'fair', method: 'direct_sow', planted: daysAgo(30), germinated: daysAgo(23), transplanted: null, firstHarvest: null, finished: null, qty: 6, source: 'Seed packet', notes: 'Planted in the shadiest spot on the spiral. Starting to get leggy in the heat.', tags: [] });

    const pi28 = uuid();
    instances.push({ id: pi28, catalogId: parsleyId, plotId: plot2Id, subPlotId: herbSubPlotIds[4], variety: 'Italian Flat Leaf', status: 'harvesting', health: 'good', method: 'transplant', planted: daysAgo(65), germinated: null, transplanted: daysAgo(65), firstHarvest: daysAgo(25), finished: null, qty: 3, source: 'Nursery start', notes: 'Biennial - will overwinter. Harvesting regularly for cooking.', tags: ['biennial'] });

    const pi29 = uuid();
    instances.push({ id: pi29, catalogId: oreganoId, plotId: plot2Id, subPlotId: herbSubPlotIds[5], variety: 'Greek', status: 'planted', health: 'good', method: 'transplant', planted: daysAgo(90), germinated: null, transplanted: daysAgo(90), firstHarvest: null, finished: null, qty: 1, source: 'Garden center', notes: 'Perennial. Spreading well along the middle tier of the spiral.', tags: ['perennial'] });

    const pi30 = uuid();
    instances.push({ id: pi30, catalogId: chiveId, plotId: plot2Id, subPlotId: herbSubPlotIds[2], variety: 'Common', status: 'harvesting', health: 'good', method: 'transplant', planted: daysAgo(100), germinated: null, transplanted: daysAgo(100), firstHarvest: daysAgo(60), finished: null, qty: 2, source: 'Division from neighbor', notes: 'Beautiful purple flowers this spring. Snipping regularly for eggs and potatoes.', tags: ['perennial'] });

    // Garden 1 - Container Corner (additional with sub-plot)
    const pi31 = uuid();
    instances.push({ id: pi31, catalogId: jalapenoId, plotId: plot4Id, subPlotId: containerSubPlotIds[1], variety: 'Early Jalapeño', status: 'growing', health: 'good', method: 'transplant', planted: daysAgo(60), germinated: null, transplanted: daysAgo(45), firstHarvest: null, finished: null, qty: 2, source: 'Nursery start', notes: 'In 3-gallon pots. Lots of flowers setting. Should have peppers soon.', tags: ['hot'] });

    // Garden 1 - Finished crop (radishes)
    const pi14 = uuid();
    instances.push({ id: pi14, catalogId: radishId, plotId: plot1Id, subPlotId: subPlotIds[2], variety: 'Cherry Belle', status: 'finished', health: 'good', method: 'direct_sow', planted: daysAgo(90), germinated: daysAgo(85), transplanted: null, firstHarvest: daysAgo(60), finished: daysAgo(55), qty: 40, source: 'Seed packet', notes: 'Quick crop. Replanted space with beans.', tags: [] });

    // Garden 2 - Plot A (linked to plotASubPlotIds)
    const pi15 = uuid();
    instances.push({ id: pi15, catalogId: tomatoId, plotId: plot5Id, subPlotId: plotASubPlotIds[0], variety: 'Better Boy', status: 'growing', health: 'good', method: 'transplant', planted: daysAgo(50), germinated: null, transplanted: daysAgo(40), firstHarvest: null, finished: null, qty: 6, source: 'Community plant swap', notes: 'Determinate variety for the community plot.', tags: [] });

    const pi16 = uuid();
    instances.push({ id: pi16, catalogId: cucId, plotId: plot5Id, subPlotId: plotASubPlotIds[3], variety: 'Straight Eight', status: 'planted', health: 'good', method: 'direct_sow', planted: daysAgo(30), germinated: daysAgo(24), transplanted: null, firstHarvest: null, finished: null, qty: 4, source: 'Seed packet', notes: 'Planted near the trellis end.', tags: [] });

    // Garden 2 - Plot A (additional plants)
    const pi32 = uuid();
    instances.push({ id: pi32, catalogId: pepperBellId, plotId: plot5Id, subPlotId: plotASubPlotIds[4], variety: 'Red Knight', status: 'growing', health: 'good', method: 'transplant', planted: daysAgo(45), germinated: null, transplanted: daysAgo(35), firstHarvest: null, finished: null, qty: 4, source: 'Community plant swap', notes: 'Hybrid variety. Growing fast in the full sun.', tags: [] });

    const pi33 = uuid();
    instances.push({ id: pi33, catalogId: zuccId, plotId: plot5Id, subPlotId: plotASubPlotIds[8], variety: 'Costata Romanesco', status: 'growing', health: 'good', method: 'direct_sow', planted: daysAgo(35), germinated: daysAgo(28), transplanted: null, firstHarvest: null, finished: null, qty: 2, source: 'Seed packet', notes: 'Italian heirloom zucchini. Ribbed and nutty flavor.', tags: ['heirloom'] });

    const pi34 = uuid();
    instances.push({ id: pi34, catalogId: beanId, plotId: plot5Id, subPlotId: plotASubPlotIds[12], variety: 'Blue Lake', status: 'growing', health: 'good', method: 'direct_sow', planted: daysAgo(28), germinated: daysAgo(22), transplanted: null, firstHarvest: null, finished: null, qty: 24, source: 'Seed packet', notes: 'Pole beans on the back trellis. Growing fast.', tags: [] });

    // Garden 2 - Plot B (Greens, linked to plotBSubPlotIds)
    const pi17 = uuid();
    instances.push({ id: pi17, catalogId: lettId, plotId: plot6Id, subPlotId: plotBSubPlotIds[0], variety: 'Buttercrunch', status: 'harvesting', health: 'fair', method: 'direct_sow', planted: daysAgo(45), germinated: daysAgo(38), transplanted: null, firstHarvest: daysAgo(15), finished: null, qty: 12, source: 'Seed packet', notes: 'Starting to bolt in the heat. Will succession plant.', tags: ['succession'] });

    const pi18 = uuid();
    instances.push({ id: pi18, catalogId: kaleId, plotId: plot6Id, subPlotId: plotBSubPlotIds[3], variety: 'Lacinato', status: 'growing', health: 'good', method: 'direct_sow', planted: daysAgo(40), germinated: daysAgo(32), transplanted: null, firstHarvest: null, finished: null, qty: 6, source: 'Seed packet', notes: 'Dinosaur kale. Looking beautiful.', tags: [] });

    const pi19 = uuid();
    instances.push({ id: pi19, catalogId: spinachId, plotId: plot6Id, subPlotId: plotBSubPlotIds[6], variety: 'Bloomsdale Long Standing', status: 'finished', health: 'fair', method: 'direct_sow', planted: daysAgo(80), germinated: daysAgo(73), transplanted: null, firstHarvest: daysAgo(50), finished: daysAgo(25), qty: 15, source: 'Seed packet', notes: 'Bolted in late spring heat. Got several good harvests first.', tags: [] });

    const pi35 = uuid();
    instances.push({ id: pi35, catalogId: swissChardId, plotId: plot6Id, subPlotId: plotBSubPlotIds[1], variety: 'Bright Lights', status: 'growing', health: 'good', method: 'direct_sow', planted: daysAgo(38), germinated: daysAgo(30), transplanted: null, firstHarvest: null, finished: null, qty: 4, source: 'Seed packet', notes: 'Colorful stems - yellow, orange, red. Heat tolerant greens alternative.', tags: [] });

    const pi36 = uuid();
    instances.push({ id: pi36, catalogId: radishId, plotId: plot6Id, subPlotId: plotBSubPlotIds[7], variety: 'Watermelon Radish', status: 'planted', health: 'good', method: 'direct_sow', planted: daysAgo(10), germinated: daysAgo(5), transplanted: null, firstHarvest: null, finished: null, qty: 15, source: 'Seed packet', notes: 'Fall planting. Beautiful pink interior. Takes about 60 days.', tags: [] });

    // Insert all plant instances
    for (const pi of instances) {
      if (!pi.catalogId) continue; // skip if plant not found in catalog
      piInsert.run(
        pi.id, pi.catalogId, pi.plotId, pi.subPlotId,
        pi.variety, pi.status, pi.health, pi.method,
        pi.planted, pi.germinated, pi.transplanted, pi.firstHarvest, pi.finished,
        pi.qty, pi.source, pi.notes, JSON.stringify(pi.tags),
        daysAgo(Math.floor(Math.random() * 30) + 30) + ' 10:00:00', now
      );
    }

    // Link sub-plots to plant instances (update sub_plot rows with their assigned plant_instance_id)
    const spUpdate = db.prepare('UPDATE sub_plots SET plant_instance_id = ? WHERE id = ?');

    // Main Raised Bed sub-plots
    if (cucId) spUpdate.run(pi4, subPlotIds[0]); // cucumber
    if (lettId) spUpdate.run(pi20, subPlotIds[1]); // red romaine lettuce
    if (radishId) spUpdate.run(pi14, subPlotIds[2]); // radishes (finished)
    if (swissChardId) spUpdate.run(pi21, subPlotIds[3]); // swiss chard
    if (zuccId) spUpdate.run(pi5, subPlotIds[4]); // zucchini
    if (onionId) spUpdate.run(pi22, subPlotIds[5]); // onions
    if (snapPeaId) spUpdate.run(pi23, subPlotIds[6]); // snap peas (finished)
    if (carrotId) spUpdate.run(pi6, subPlotIds[8]); // carrots
    if (beetId) spUpdate.run(pi24, subPlotIds[9]); // beets
    if (spinachId) spUpdate.run(pi25, subPlotIds[10]); // spinach (finished)
    if (beanId) spUpdate.run(pi7, subPlotIds[12]); // beans
    if (radishId) spUpdate.run(pi26, subPlotIds[13]); // french breakfast radish (succession)

    // Herb Spiral sub-plots
    if (rosemaryId) spUpdate.run(pi9, herbSubPlotIds[0]); // rosemary
    if (basilId) spUpdate.run(pi8, herbSubPlotIds[1]); // basil
    if (chiveId) spUpdate.run(pi30, herbSubPlotIds[2]); // chives
    if (thymeId) spUpdate.run(pi10, herbSubPlotIds[3]); // thyme
    if (parsleyId) spUpdate.run(pi28, herbSubPlotIds[4]); // parsley
    if (oreganoId) spUpdate.run(pi29, herbSubPlotIds[5]); // oregano
    if (cilantroId) spUpdate.run(pi27, herbSubPlotIds[7]); // cilantro
    if (mintId) spUpdate.run(pi11, herbSubPlotIds[8]); // mint

    // Tomato Row sub-plots
    if (tomatoId) spUpdate.run(pi1, tomatoSubPlotIds[0]); // Cherokee Purple
    if (tomatoId) spUpdate.run(pi2, tomatoSubPlotIds[2]); // Sun Gold Cherry
    if (tomatoId) spUpdate.run(pi3, tomatoSubPlotIds[4]); // Roma

    // Container Corner sub-plots
    if (pepperBellId) spUpdate.run(pi12, containerSubPlotIds[0]); // bell pepper
    if (jalapenoId) spUpdate.run(pi31, containerSubPlotIds[1]); // jalapeño
    if (strawberryId) spUpdate.run(pi13, containerSubPlotIds[2]); // strawberry

    // Plot A (community) sub-plots
    if (tomatoId) spUpdate.run(pi15, plotASubPlotIds[0]); // Better Boy tomato
    if (cucId) spUpdate.run(pi16, plotASubPlotIds[3]); // Straight Eight cucumber
    if (pepperBellId) spUpdate.run(pi32, plotASubPlotIds[4]); // Red Knight pepper
    if (zuccId) spUpdate.run(pi33, plotASubPlotIds[8]); // Costata Romanesco zucchini
    if (beanId) spUpdate.run(pi34, plotASubPlotIds[12]); // Blue Lake beans

    // Plot B (greens, community) sub-plots
    if (lettId) spUpdate.run(pi17, plotBSubPlotIds[0]); // buttercrunch lettuce
    if (swissChardId) spUpdate.run(pi35, plotBSubPlotIds[1]); // Bright Lights chard
    if (kaleId) spUpdate.run(pi18, plotBSubPlotIds[3]); // Lacinato kale
    if (spinachId) spUpdate.run(pi19, plotBSubPlotIds[6]); // spinach (finished)
    if (radishId) spUpdate.run(pi36, plotBSubPlotIds[7]); // watermelon radish

    // ─── Harvests ───
    const hInsert = db.prepare(`INSERT INTO harvests (id, plant_instance_id, plot_id, date_harvested, quantity, unit, quality, destination, weight_oz, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    // Tomato harvests
    hInsert.run(uuid(), pi1, plot3Id, daysAgo(10), 3, 'count', 'good', 'eaten_fresh', 18, 'First Cherokee Purples of the season! Beautiful color.', now, now);
    hInsert.run(uuid(), pi1, plot3Id, daysAgo(5), 5, 'count', 'excellent', 'eaten_fresh', 30, 'Peak flavor. Made bruschetta.', now, now);
    hInsert.run(uuid(), pi1, plot3Id, daysAgo(1), 4, 'count', 'good', 'shared', 22, 'Gave some to the neighbors.', now, now);
    hInsert.run(uuid(), pi2, plot3Id, daysAgo(14), 20, 'count', 'excellent', 'eaten_fresh', 10, 'Cherry tomatoes popping. Perfect snack.', now, now);
    hInsert.run(uuid(), pi2, plot3Id, daysAgo(7), 35, 'count', 'excellent', 'eaten_fresh', 16, 'Overflowing! Kids pick them right off the vine.', now, now);
    hInsert.run(uuid(), pi2, plot3Id, daysAgo(2), 25, 'count', 'good', 'stored', 12, 'Roasted a batch for the freezer.', now, now);

    // Cucumber harvest
    hInsert.run(uuid(), pi4, plot1Id, daysAgo(7), 2, 'count', 'good', 'eaten_fresh', 14, 'First cukes. Nice and crisp.', now, now);
    hInsert.run(uuid(), pi4, plot1Id, daysAgo(3), 4, 'count', 'excellent', 'eaten_fresh', 28, 'Made cucumber salad.', now, now);

    // Zucchini harvest
    hInsert.run(uuid(), pi5, plot1Id, daysAgo(5), 2, 'count', 'good', 'eaten_fresh', 24, 'First zucchini. Grilled them.', now, now);
    hInsert.run(uuid(), pi5, plot1Id, daysAgo(1), 3, 'count', 'good', 'shared', 32, 'Already too many! Shared with coworkers.', now, now);

    // Basil harvests
    hInsert.run(uuid(), pi8, plot2Id, daysAgo(20), 1, 'bunch', 'excellent', 'eaten_fresh', 2, 'First basil harvest. Caprese time!', now, now);
    hInsert.run(uuid(), pi8, plot2Id, daysAgo(10), 2, 'bunch', 'excellent', 'preserved', 4, 'Made a big batch of pesto for the freezer.', now, now);

    // Strawberry harvests
    hInsert.run(uuid(), pi13, plot4Id, daysAgo(25), 8, 'count', 'good', 'eaten_fresh', 4, 'First ripe berries. Sweet!', now, now);
    hInsert.run(uuid(), pi13, plot4Id, daysAgo(18), 15, 'count', 'excellent', 'eaten_fresh', 7, 'Steady production now.', now, now);
    hInsert.run(uuid(), pi13, plot4Id, daysAgo(10), 12, 'count', 'good', 'eaten_fresh', 6, 'Delicious with morning oatmeal.', now, now);

    // Radish harvests (finished crop)
    hInsert.run(uuid(), pi14, plot1Id, daysAgo(60), 15, 'count', 'excellent', 'eaten_fresh', 8, 'Perfect little globes. 25 days from seed!', now, now);
    hInsert.run(uuid(), pi14, plot1Id, daysAgo(55), 20, 'count', 'good', 'eaten_fresh', 10, 'Last of the radishes. Some got a bit pithy.', now, now);

    // Lettuce harvests
    hInsert.run(uuid(), pi17, plot6Id, daysAgo(15), 3, 'heads', 'good', 'eaten_fresh', 12, 'First cut of buttercrunch. So tender.', now, now);
    hInsert.run(uuid(), pi17, plot6Id, daysAgo(8), 4, 'heads', 'fair', 'eaten_fresh', 14, 'Starting to get a bit bitter in the heat.', now, now);

    // Spinach harvests (finished crop)
    hInsert.run(uuid(), pi19, plot6Id, daysAgo(50), 2, 'bunches', 'excellent', 'eaten_fresh', 8, 'Baby spinach salad.', now, now);
    hInsert.run(uuid(), pi19, plot6Id, daysAgo(40), 3, 'bunches', 'good', 'eaten_fresh', 10, 'Sauteed with garlic. Delicious.', now, now);
    hInsert.run(uuid(), pi19, plot6Id, daysAgo(30), 2, 'bunches', 'fair', 'eaten_fresh', 6, 'Getting leggy. Will bolt soon.', now, now);

    // ─── Notes ───
    const noteInsert = db.prepare(`INSERT INTO notes (id, content, content_type, entity_links, photo_ids, tags, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    noteInsert.run(uuid(),
      'Started hardening off tomato seedlings today. Set them outside for 2 hours in dappled shade. Will increase exposure over the next week before transplanting.',
      'text', JSON.stringify([{ type: 'garden', id: garden1Id }]), '[]', JSON.stringify(['seedlings', 'tomatoes']), 0,
      daysAgo(60) + ' 08:30:00', daysAgo(60) + ' 08:30:00');

    noteInsert.run(uuid(),
      'Noticed some aphids on the kale at the community garden. Sprayed with neem oil solution (1 tbsp neem + 1 tsp dish soap per quart of water). Will check again in a few days.',
      'text', JSON.stringify([{ type: 'garden', id: garden2Id }]), '[]', JSON.stringify(['pests', 'organic']), 0,
      daysAgo(35) + ' 17:00:00', daysAgo(35) + ' 17:00:00');

    noteInsert.run(uuid(),
      'Big harvest day! Cherokee Purples finally ripening. The Sun Golds have been going for two weeks already. Made bruschetta with fresh basil from the herb spiral - garden to table in 5 minutes!',
      'text', JSON.stringify([{ type: 'garden', id: garden1Id }]), '[]', JSON.stringify(['harvest', 'cooking']), 1,
      daysAgo(10) + ' 18:00:00', daysAgo(10) + ' 18:00:00');

    noteInsert.run(uuid(),
      'Soil pH test results for the main raised bed: 6.4 - perfect range for most veggies. The tomato row tested at 6.8, added some sulfur to bring it down slightly. Community plot soil is a bit compacted, need to add more compost.',
      'text', JSON.stringify([]), '[]', JSON.stringify(['soil', 'testing']), 0,
      daysAgo(45) + ' 14:00:00', daysAgo(45) + ' 14:00:00');

    noteInsert.run(uuid(),
      'Planning fall garden: want to do succession lettuce, more kale, garlic (plant in October), and cover crop the tomato row with crimson clover. Need to order garlic bulbs by September.',
      'text', JSON.stringify([{ type: 'garden', id: garden1Id }]), '[]', JSON.stringify(['planning', 'fall']), 1,
      daysAgo(5) + ' 20:00:00', daysAgo(5) + ' 20:00:00');

    noteInsert.run(uuid(),
      'The mint is trying to escape its buried pot again. Need to trim the runners. Note to self: NEVER plant mint directly in the ground!',
      'text', JSON.stringify([{ type: 'garden', id: garden1Id }]), '[]', JSON.stringify(['herbs', 'mint']), 0,
      daysAgo(15) + ' 09:00:00', daysAgo(15) + ' 09:00:00');

    noteInsert.run(uuid(),
      'Composting update: The second bin is almost ready - nice dark crumbly texture with earthy smell. Will screen it next weekend and top-dress the raised bed. First bin just got a load of kitchen scraps and grass clippings, turned and watered.',
      'text', JSON.stringify([{ type: 'garden', id: garden1Id }]), '[]', JSON.stringify(['composting', 'soil']), 0,
      daysAgo(22) + ' 16:30:00', daysAgo(22) + ' 16:30:00');

    noteInsert.run(uuid(),
      'Discovered a big green tomato hornworm on one of the Cherokee Purples today! Relocated it to the woods. Need to check the other tomato plants more carefully. The wasps are supposedly natural predators - saw some braconid wasps nearby which is a good sign.',
      'text', JSON.stringify([{ type: 'plant_instance', id: pi1 }]), '[]', JSON.stringify(['pests', 'tomatoes']), 0,
      daysAgo(18) + ' 07:45:00', daysAgo(18) + ' 07:45:00');

    noteInsert.run(uuid(),
      'Neighbor recommended trying straw bale gardening next year for the area by the back fence that has terrible clay soil. Could be a good way to expand without more raised bed lumber costs. Research over winter.',
      'text', JSON.stringify([{ type: 'garden', id: garden1Id }]), '[]', JSON.stringify(['planning', 'ideas']), 0,
      daysAgo(8) + ' 21:00:00', daysAgo(8) + ' 21:00:00');

    noteInsert.run(uuid(),
      'Community garden meeting notes: New water schedule starts next month - odd plots water Mon/Wed/Fri, even plots Tue/Thu/Sat. They are adding a shared tool shed by the entrance. Potluck harvest party planned for September!',
      'text', JSON.stringify([{ type: 'garden', id: garden2Id }]), '[]', JSON.stringify(['community', 'planning']), 1,
      daysAgo(3) + ' 19:00:00', daysAgo(3) + ' 19:00:00');

    noteInsert.run(uuid(),
      'The drip irrigation timer stopped working after the last power flicker. Reset it to water 30 min every morning at 6am. Also noticed one emitter is clogged near the zucchini - cleaned it with a pin. Everything flowing well now.',
      'text', JSON.stringify([{ type: 'plot', id: plot1Id }]), '[]', JSON.stringify(['irrigation', 'maintenance']), 0,
      daysAgo(12) + ' 10:15:00', daysAgo(12) + ' 10:15:00');

    noteInsert.run(uuid(),
      'First pesto of the season! Used basil from the herb spiral, garlic from the farmers market, pine nuts, and parmesan. Made 3 cups and froze 2 in ice cube trays. The Genovese basil has incredible flavor this year.',
      'text', JSON.stringify([{ type: 'plant_instance', id: pi8 }]), '[]', JSON.stringify(['harvest', 'cooking', 'herbs']), 0,
      daysAgo(10) + ' 19:30:00', daysAgo(10) + ' 19:30:00');

    noteInsert.run(uuid(),
      'Rain gauge measured 1.5 inches overnight from the thunderstorm. Skipping watering today and tomorrow. The container plants on the covered patio still need water though - they were sheltered from the rain.',
      'text', JSON.stringify([{ type: 'garden', id: garden1Id }]), '[]', JSON.stringify(['weather', 'watering']), 0,
      daysAgo(6) + ' 08:00:00', daysAgo(6) + ' 08:00:00');

    noteInsert.run(uuid(),
      'Tried companion planting marigolds between the tomatoes this year and seems to be working - way fewer whiteflies than last season. Also interplanted basil which is supposed to improve tomato flavor. Will keep doing this combo.',
      'text', JSON.stringify([{ type: 'plot', id: plot3Id }]), '[]', JSON.stringify(['companion-planting', 'tomatoes']), 0,
      daysAgo(25) + ' 17:00:00', daysAgo(25) + ' 17:00:00');

    noteInsert.run(uuid(),
      'Container peppers are looking a bit leggy. Moved them to a sunnier spot on the patio. The jalapeños are setting fruit - counted 8 small peppers forming! Bell peppers are slower but have lots of flowers.',
      'text', JSON.stringify([{ type: 'plot', id: plot4Id }]), '[]', JSON.stringify(['peppers', 'containers']), 0,
      daysAgo(14) + ' 11:00:00', daysAgo(14) + ' 11:00:00');

    // ─── Tasks ───
    const taskInsert = db.prepare(`INSERT INTO tasks (id, entity_type, entity_id, task_type, title, description, due_date, completed_date, priority, status, auto_generated, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    taskInsert.run(uuid(), 'garden', garden1Id, 'watering', 'Water container plants', 'Check containers daily in hot weather. Peppers and strawberries dry out fast.', today, null, 'high', 'pending', 0, daysAgo(7) + ' 08:00:00', now);

    taskInsert.run(uuid(), 'plot', plot3Id, 'maintenance', 'Prune tomato suckers', 'Remove suckers below first flower cluster on Cherokee Purples and Romas. Sun Golds can stay bushy.', daysFromNow(2), null, 'medium', 'pending', 0, daysAgo(5) + ' 08:00:00', now);

    taskInsert.run(uuid(), 'garden', garden1Id, 'harvesting', 'Harvest ripe tomatoes and cucumbers', 'Check tomato row and raised bed daily. Cherry tomatoes ripen fast!', today, null, 'medium', 'pending', 0, daysAgo(3) + ' 08:00:00', now);

    taskInsert.run(uuid(), 'plot', plot6Id, 'planting', 'Succession plant lettuce', 'Current lettuce is bolting. Start new seeds in partial shade for fall crop.', daysFromNow(5), null, 'medium', 'pending', 0, daysAgo(2) + ' 08:00:00', now);

    taskInsert.run(uuid(), 'garden', garden2Id, 'maintenance', 'Weed community garden plots', 'Both plots need weeding. Bring hoe and kneeling pad.', daysFromNow(1), null, 'low', 'pending', 0, daysAgo(4) + ' 08:00:00', now);

    taskInsert.run(uuid(), 'garden', garden1Id, 'other', 'Order garlic bulbs for fall planting', 'Need hardneck varieties for Zone 7b. Plant in October. Check Territorial Seed, Southern Exposure, or Filaree Farm.', daysFromNow(30), null, 'low', 'pending', 0, daysAgo(5) + ' 08:00:00', now);

    // ─── Auto-generated weather alerts (these show in the AlertBanner on the dashboard) ───
    const alertInsert = db.prepare(`INSERT INTO tasks (id, entity_type, entity_id, task_type, title, description, due_date, completed_date, priority, status, auto_generated, source_reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    alertInsert.run(uuid(), 'garden', garden1Id, 'frost_alert',
      `Freeze Warning: 28°F expected on ${daysFromNow(1)}`,
      'Low temperature of 28°F forecasted. Cover or bring in frost-sensitive plants.',
      daysFromNow(1), null, 'urgent', 'pending', 1, 'weather_forecast',
      daysAgo(0) + ' 06:00:00', now);

    alertInsert.run(uuid(), 'garden', garden1Id, 'frost_alert',
      `Frost Advisory: 34°F expected on ${daysFromNow(2)}`,
      'Low temperature of 34°F forecasted. Cover or bring in frost-sensitive plants.',
      daysFromNow(2), null, 'high', 'pending', 1, 'weather_forecast',
      daysAgo(0) + ' 06:00:00', now);

    alertInsert.run(uuid(), 'garden', garden2Id, 'frost_alert',
      `Freeze Warning: 29°F expected on ${daysFromNow(1)}`,
      'Low temperature of 29°F forecasted. Cover or bring in frost-sensitive plants.',
      daysFromNow(1), null, 'urgent', 'pending', 1, 'weather_forecast',
      daysAgo(0) + ' 06:00:00', now);

    // Completed tasks
    taskInsert.run(uuid(), 'plot', plot1Id, 'planting', 'Thin carrot seedlings', 'Thin to 2 inch spacing. Use scissors to avoid disturbing roots.', daysAgo(10), daysAgo(10), 'medium', 'completed', 0, daysAgo(15) + ' 08:00:00', daysAgo(10) + ' 16:00:00');

    taskInsert.run(uuid(), 'garden', garden1Id, 'maintenance', 'Set up drip irrigation for raised bed', 'Install drip lines with 12-inch emitter spacing. Connect to garden hose timer.', daysAgo(60), daysAgo(62), 'high', 'completed', 0, daysAgo(65) + ' 08:00:00', daysAgo(62) + ' 17:00:00');

    taskInsert.run(uuid(), 'plot', plot3Id, 'maintenance', 'Install tomato cages', 'Use 6ft heavy-duty cages for Cherokee Purple and Roma. Stake Sun Golds.', daysAgo(50), daysAgo(52), 'high', 'completed', 0, daysAgo(55) + ' 08:00:00', daysAgo(52) + ' 15:00:00');

    // ─── Pest Events ───
    const pestInsert = db.prepare(`INSERT INTO pest_events (id, entity_type, entity_id, pest_type, pest_name, severity, detected_date, resolved_date, treatment_applied, treatment_type, outcome, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    pestInsert.run(uuid(), 'plant_instance', pi3, 'disease', 'Blossom End Rot', 'medium', daysAgo(30), daysAgo(20),
      'Added calcium supplement (bone meal) and ensured consistent watering schedule.', 'organic',
      'resolved', 'Caused by inconsistent watering in hot spell. First 3 fruits affected, subsequent ones fine after treatment.',
      daysAgo(30) + ' 10:00:00', daysAgo(20) + ' 10:00:00');

    pestInsert.run(uuid(), 'plant_instance', pi18, 'insect', 'Aphids', 'low', daysAgo(35), daysAgo(28),
      'Applied neem oil spray. Also introduced ladybugs from garden center.', 'organic',
      'resolved', 'Small cluster on underside of leaves. Caught early. Ladybugs cleaned them up within a week.',
      daysAgo(35) + ' 17:00:00', daysAgo(28) + ' 17:00:00');

    pestInsert.run(uuid(), 'plot', plot1Id, 'insect', 'Slugs', 'low', daysAgo(20), null,
      'Set out beer traps and crushed eggshell barriers around seedlings.', 'organic',
      'ongoing', 'Finding slug trails on lettuce and young bean plants. Beer traps catching a few each night.',
      daysAgo(20) + ' 07:00:00', now);

    // ─── Soil Tests ───
    const soilInsert = db.prepare(`INSERT INTO soil_tests (id, plot_id, test_date, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, organic_matter_pct, moisture_level, amendments_applied, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    soilInsert.run(uuid(), plot1Id, daysAgo(45), 6.4, 35, 28, 180, 5.2, 'adequate',
      JSON.stringify(['compost - 2 inches', 'bone meal - 1 cup per 10 sq ft']),
      'Good overall. Added compost in spring before planting. Nutrient levels healthy.', now, now);

    soilInsert.run(uuid(), plot3Id, daysAgo(45), 6.8, 25, 32, 200, 3.8, 'adequate',
      JSON.stringify(['sulfur - 1 lb per 100 sq ft', 'compost - 3 inches']),
      'pH slightly high for tomatoes. Added sulfur. Clay loam drains well enough with the compost amendment.', now, now);

    soilInsert.run(uuid(), plot5Id, daysAgo(40), 6.6, 22, 20, 150, 3.2, 'low',
      JSON.stringify(['compost - 4 inches', 'aged manure - 2 inches']),
      'Community plot soil is heavy clay. Needs organic matter. Working in compost each season.', now, now);

    // ─── Seed Inventory ───
    const seedInvInsert = db.prepare(`INSERT INTO seed_inventory (id, plant_catalog_id, variety_name, brand, source, quantity_packets, quantity_seeds_approx, purchase_date, expiration_date, storage_location, cost_cents, notes, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    if (tomatoId) seedInvInsert.run(uuid(), tomatoId, 'Cherokee Purple', 'Southern Exposure', 'Online order', 2, 50, daysAgo(150), daysFromNow(365), 'Fridge seed box', 395, 'Open-pollinated. Saving seeds from this year\'s crop too.', JSON.stringify(['heirloom']), now, now);
    if (carrotId) seedInvInsert.run(uuid(), carrotId, 'Nantes Half Long', 'Botanical Interests', 'Local garden center', 1, 500, daysAgo(120), daysFromNow(700), 'Fridge seed box', 299, 'Lots of seeds. Good for succession planting.', JSON.stringify([]), now, now);
    if (lettId) seedInvInsert.run(uuid(), lettId, 'Buttercrunch', 'Johnny\'s Seeds', 'Online order', 3, 1500, daysAgo(100), daysFromNow(500), 'Fridge seed box', 450, 'Bulk pack for succession planting through fall.', JSON.stringify(['succession']), now, now);
    if (beanId) seedInvInsert.run(uuid(), beanId, 'Provider', 'Ferry-Morse', 'Hardware store', 1, 60, daysAgo(90), daysFromNow(600), 'Garage shelf', 249, 'Bush type. Quick producer.', JSON.stringify([]), now, now);
    if (radishId) seedInvInsert.run(uuid(), radishId, 'Cherry Belle', 'Burpee', 'Big box store', 2, 400, daysAgo(130), daysFromNow(400), 'Fridge seed box', 199, 'Classic radish. 25 days to maturity!', JSON.stringify([]), now, now);

    // ─── LLM Conversations ───
    const convInsert = db.prepare(`INSERT INTO llm_conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`);
    const msgInsert = db.prepare(`INSERT INTO llm_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`);

    const conv1Id = uuid();
    convInsert.run(conv1Id, 'Tomato blossom end rot help', daysAgo(30) + ' 10:00:00', daysAgo(30) + ' 10:05:00');
    msgInsert.run(uuid(), conv1Id, 'user', 'My Roma tomatoes have dark spots on the bottom of the fruit. What\'s going on?', daysAgo(30) + ' 10:00:00');
    msgInsert.run(uuid(), conv1Id, 'assistant', 'It sounds like blossom end rot (BER), which is a common tomato problem. The dark, sunken spots on the bottom of the fruit are caused by a calcium deficiency in the developing fruit, usually triggered by inconsistent watering rather than a lack of calcium in the soil.\n\nHere\'s what you can do:\n1. **Water consistently** - Aim for 1-2 inches per week, applied evenly\n2. **Mulch heavily** - 3-4 inches of straw or wood chips to retain moisture\n3. **Add calcium** - Bone meal or crushed eggshells worked into the soil\n4. **Avoid over-fertilizing** with nitrogen, which can inhibit calcium uptake\n\nThe affected fruits won\'t recover, but new fruits should be fine once you stabilize the watering.', daysAgo(30) + ' 10:01:00');
    msgInsert.run(uuid(), conv1Id, 'user', 'Thanks! I think it was from that hot dry spell last week. I\'ll set up a more consistent watering schedule.', daysAgo(30) + ' 10:05:00');

    const conv2Id = uuid();
    convInsert.run(conv2Id, 'Fall garden planning', daysAgo(5) + ' 20:00:00', daysAgo(5) + ' 20:10:00');
    msgInsert.run(uuid(), conv2Id, 'user', 'What should I plant in my Zone 7b garden for fall? I have a 4x8 raised bed that will be opening up soon.', daysAgo(5) + ' 20:00:00');
    msgInsert.run(uuid(), conv2Id, 'assistant', 'Great timing to plan your fall garden in Zone 7b! With your first frost around October 20th, here\'s a planting timeline:\n\n**Plant Now (late summer):**\n- Kale and collards - direct sow, they\'ll sweeten after frost\n- Broccoli and cauliflower - transplants if you can find them\n- Brussels sprouts - transplants (they need a long season)\n\n**Plant in 2-3 weeks:**\n- Lettuce (succession plant every 2 weeks)\n- Spinach\n- Radishes\n- Turnips\n- Beets\n\n**Plant in October:**\n- Garlic (hardneck varieties like Music or German Extra Hardy)\n- Cover crops (crimson clover or winter rye)\n\nFor your 4x8 bed, I\'d suggest: kale and broccoli at one end, succession lettuce in the middle, and save space for garlic in October.', daysAgo(5) + ' 20:02:00');
    msgInsert.run(uuid(), conv2Id, 'user', 'Perfect! I definitely want to do garlic. What varieties do you recommend for Zone 7b?', daysAgo(5) + ' 20:05:00');
    msgInsert.run(uuid(), conv2Id, 'assistant', 'For Zone 7b, you\'re right in the sweet spot where both hardneck and softneck garlic can thrive. Here are my top picks:\n\n**Hardneck (larger cloves, scapes in spring, slightly shorter storage):**\n- **Music** - Large bulbs, easy to peel, stores 6-8 months\n- **German Extra Hardy** - Very cold-tolerant, rich flavor\n- **Chesnok Red** - Amazing for roasting, beautiful purple stripes\n\n**Softneck (longer storage, more cloves per bulb):**\n- **Inchelium Red** - Mild flavor, stores up to 9 months\n- **Silver White** - Great for braiding, stores well\n\nOrder soon from specialty suppliers like Filaree Farm, Territorial Seed, or Southern Exposure Seed Exchange. Plant cloves 2-3 inches deep, 6 inches apart, in mid-October. Mulch heavily with straw after the ground freezes.', daysAgo(5) + ' 20:07:00');

    // ─── History Log (a few representative entries) ───
    const histInsert = db.prepare(`INSERT INTO history_log (id, entity_type, entity_id, action, timestamp, field_changes_json, snapshot_json, changed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    histInsert.run(uuid(), 'garden', garden1Id, 'create', daysAgo(120) + ' 10:00:00', null, null, 'user', 'Initial garden setup');
    histInsert.run(uuid(), 'garden', garden2Id, 'create', daysAgo(90) + ' 10:00:00', null, null, 'user', 'Added community garden plot');
    histInsert.run(uuid(), 'plot', plot1Id, 'create', daysAgo(120) + ' 10:30:00', null, null, 'user', 'Created main raised bed');
    histInsert.run(uuid(), 'plant_instance', pi1, 'create', daysAgo(75) + ' 09:00:00', null, null, 'user', 'Planted Cherokee Purple tomatoes');
    histInsert.run(uuid(), 'plant_instance', pi1, 'update', daysAgo(10) + ' 18:00:00', JSON.stringify({ status: { from: 'growing', to: 'harvesting' } }), null, 'user', 'First harvest!');

    const totalSubPlots = subPlotIds.length + herbSubPlotIds.length + tomatoSubPlotIds.length + containerSubPlotIds.length + plotASubPlotIds.length + plotBSubPlotIds.length;

    return {
      gardens: 2,
      plots: 6,
      subPlots: totalSubPlots,
      plantInstances: instances.filter(i => i.catalogId).length,
      harvests: 22,
      notes: 16,
      tasks: 9,
      pestEvents: 3,
      soilTests: 3,
      seedInventory: [tomatoId, carrotId, lettId, beanId, radishId].filter(Boolean).length,
      conversations: 2,
    };
  });

  return seed();
}
