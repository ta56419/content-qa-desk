import 'reflect-metadata';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Draft } from '../shared/types';
import { ReportsService } from './reports.service';

// Empty strings are allowed: missing content is a QA finding, not a request error.
function validateDraft(body: unknown): Draft {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new BadRequestException('Send a draft object.');
  const input = body as Record<string, unknown>;
  for (const [field, max] of [
    ['title', 300],
    ['metaDescription', 1000],
    ['html', 100000],
  ] as const) {
    if (typeof input[field] !== 'string' || input[field].length > max) {
      throw new BadRequestException(
        `${field} must be text, at most ${max} characters.`,
      );
    }
  }
  return {
    title: input.title as string,
    metaDescription: input.metaDescription as string,
    html: input.html as string,
  };
}

@Controller('api/reports')
class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Post() create(@Body() body: unknown) {
    return this.reports.create(validateDraft(body));
  }
  @Get() list() {
    return this.reports.list();
  }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) {
    return this.reports.get(id);
  }
}
@Module({ controllers: [ReportsController], providers: [ReportsService] })
class AppModule {}

export async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'],
  });
  app.useBodyParser('json', { limit: '512kb' });
  app.enableShutdownHooks();
  return app;
}
