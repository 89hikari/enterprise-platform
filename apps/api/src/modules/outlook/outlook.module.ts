import { Module } from '@nestjs/common';
import { OutlookController } from './outlook.controller';
import { OutlookService } from './outlook.service';
import { MicrosoftModule } from '../microsoft/microsoft.module';

@Module({
  imports: [MicrosoftModule],
  controllers: [OutlookController],
  providers: [OutlookService],
})
export class OutlookModule {}
