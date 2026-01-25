/**
 * Admin Personalization Config API
 *
 * GET /api/admin/personalization - List all configs
 * POST /api/admin/personalization - Create new config
 * PUT /api/admin/personalization - Update existing config
 *
 * Allows administrators to manage personalization configurations
 * for A/B testing and feature flag control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET - List all personalization configs
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is admin
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Get query parameters
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get('includeMetrics') === 'true';

    // 4. Fetch configs
    const configs = await db.personalization_config.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 5. Optionally include recent metrics
    let metricsMap: Record<string, any> = {};
    if (includeMetrics) {
      const recentMetrics = await db.personalization_metrics.findMany({
        where: {
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        orderBy: { date: 'desc' },
      });

      // Group by config name
      for (const metric of recentMetrics) {
        if (!metricsMap[metric.configName]) {
          metricsMap[metric.configName] = [];
        }
        metricsMap[metric.configName].push(metric);
      }
    }

    // 6. Return response
    return NextResponse.json({
      configs: configs.map(config => ({
        ...config,
        metrics: includeMetrics ? metricsMap[config.name] || [] : undefined,
      })),
      total: configs.length,
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching personalization configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configs' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create new personalization config
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is super admin (config creation is sensitive)
    const userRole = (session.user as any).role;
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      name,
      description,
      baseScoreWeight = 0.55,
      behavioralWeight = 0.25,
      cfWeight = 0.10,
      contextualWeight = 0.10,
      explorationSlots = 2,
      explorationStrategy = 'epsilon_greedy',
      enableBehavioral = true,
      enableItemItemCF = true,
      enableContextual = true,
      enableExploration = true,
      trafficPercentage,
    } = body;

    // 4. Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // 5. Validate weights sum to 1.0
    const weightSum = baseScoreWeight + behavioralWeight + cfWeight + contextualWeight;
    if (Math.abs(weightSum - 1.0) > 0.001) {
      return NextResponse.json(
        { error: `Weights must sum to 1.0 (current: ${weightSum.toFixed(3)})` },
        { status: 400 }
      );
    }

    // 6. Check for duplicate name
    const existing = await db.personalization_config.findUnique({
      where: { name },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Config with this name already exists' },
        { status: 409 }
      );
    }

    // 7. Create config
    const config = await db.personalization_config.create({
      data: {
        name,
        description,
        baseScoreWeight,
        behavioralWeight,
        cfWeight,
        contextualWeight,
        explorationSlots,
        explorationStrategy,
        enableBehavioral,
        enableItemItemCF,
        enableContextual,
        enableExploration,
        trafficPercentage,
        isActive: false, // New configs are inactive by default
      },
    });

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('[ADMIN] Error creating personalization config:', error);
    return NextResponse.json(
      { error: 'Failed to create config' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update existing personalization config
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is admin
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Config ID is required' },
        { status: 400 }
      );
    }

    // 4. Check config exists
    const existing = await db.personalization_config.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    // 5. Validate weights if being updated
    if (
      updates.baseScoreWeight !== undefined ||
      updates.behavioralWeight !== undefined ||
      updates.cfWeight !== undefined ||
      updates.contextualWeight !== undefined
    ) {
      const weightSum =
        (updates.baseScoreWeight ?? existing.baseScoreWeight) +
        (updates.behavioralWeight ?? existing.behavioralWeight) +
        (updates.cfWeight ?? existing.cfWeight) +
        (updates.contextualWeight ?? existing.contextualWeight);

      if (Math.abs(weightSum - 1.0) > 0.001) {
        return NextResponse.json(
          { error: `Weights must sum to 1.0 (current: ${weightSum.toFixed(3)})` },
          { status: 400 }
        );
      }
    }

    // 6. If activating, ensure only one config is active
    if (updates.isActive === true) {
      await db.personalization_config.updateMany({
        where: {
          isActive: true,
          id: { not: id },
        },
        data: { isActive: false },
      });
    }

    // 7. Update config
    const config = await db.personalization_config.update({
      where: { id },
      data: {
        ...updates,
        name: undefined, // Name cannot be changed
      },
    });

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('[ADMIN] Error updating personalization config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete personalization config
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is super admin
    const userRole = (session.user as any).role;
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    // 3. Get config ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Config ID is required' },
        { status: 400 }
      );
    }

    // 4. Check config exists
    const existing = await db.personalization_config.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    // 5. Prevent deleting active config
    if (existing.isActive) {
      return NextResponse.json(
        { error: 'Cannot delete active config. Deactivate first.' },
        { status: 400 }
      );
    }

    // 6. Delete config
    await db.personalization_config.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Config deleted',
    });
  } catch (error) {
    console.error('[ADMIN] Error deleting personalization config:', error);
    return NextResponse.json(
      { error: 'Failed to delete config' },
      { status: 500 }
    );
  }
}
