import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704067200000 implements MigrationInterface {
  name = 'InitialSchema1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── users ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\`         VARCHAR(36)                              NOT NULL,
        \`email\`      VARCHAR(255)                             NOT NULL,
        \`password\`   VARCHAR(255)                             NOT NULL,
        \`firstName\`  VARCHAR(255)                             NOT NULL,
        \`lastName\`   VARCHAR(255)                             NOT NULL,
        \`phone\`      VARCHAR(255)                             NULL,
        \`role\`       ENUM('admin', 'bussines', 'client')      NOT NULL DEFAULT 'client',
        \`isActive\`   TINYINT(1)                               NOT NULL DEFAULT 1,
        \`createdAt\`  DATETIME(6)                              NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\`  DATETIME(6)                              NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── businesses ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`businesses\` (
        \`id\`          VARCHAR(36)   NOT NULL,
        \`name\`        VARCHAR(255)  NOT NULL,
        \`description\` TEXT          NULL,
        \`phone\`       VARCHAR(255)  NOT NULL,
        \`email\`       VARCHAR(255)  NULL,
        \`address\`     TEXT          NOT NULL,
        \`latitude\`    DECIMAL(10,8) NOT NULL,
        \`longitude\`   DECIMAL(11,8) NOT NULL,
        \`features\`    JSON          NULL,
        \`isActive\`    TINYINT(1)    NOT NULL DEFAULT 1,
        \`ownerId\`     VARCHAR(36)   NOT NULL,
        \`createdAt\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_businesses_ownerId\` (\`ownerId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`businesses\`
        ADD CONSTRAINT \`FK_businesses_ownerId\`
        FOREIGN KEY (\`ownerId\`) REFERENCES \`users\`(\`id\`)
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // ─── business_schedules ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`business_schedules\` (
        \`id\`         VARCHAR(36)                                                                    NOT NULL,
        \`dayOfWeek\`  ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday')   NOT NULL,
        \`openTime\`   TIME                                                                           NOT NULL,
        \`closeTime\`  TIME                                                                           NOT NULL,
        \`isOpen\`     TINYINT(1)                                                                     NOT NULL DEFAULT 1,
        \`businessId\` VARCHAR(36)                                                                    NOT NULL,
        INDEX \`IDX_business_schedules_businessId\` (\`businessId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`business_schedules\`
        ADD CONSTRAINT \`FK_business_schedules_businessId\`
        FOREIGN KEY (\`businessId\`) REFERENCES \`businesses\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ─── courts ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`courts\` (
        \`id\`           VARCHAR(36)                                                                                          NOT NULL,
        \`name\`         VARCHAR(255)                                                                                         NOT NULL,
        \`type\`         ENUM('football_5','football_7','football_8','football_11','futsal','beach_soccer','mini_football')   NOT NULL,
        \`description\`  TEXT                                                                                                 NULL,
        \`pricePerHour\` DECIMAL(10,2)                                                                                        NOT NULL,
        \`status\`       ENUM('available','maintenance','inactive')                                                           NOT NULL DEFAULT 'available',
        \`features\`     JSON                                                                                                 NULL,
        \`businessId\`   VARCHAR(36)                                                                                          NOT NULL,
        \`createdAt\`    DATETIME(6)                                                                                          NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\`    DATETIME(6)                                                                                          NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_courts_businessId\` (\`businessId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`courts\`
        ADD CONSTRAINT \`FK_courts_businessId\`
        FOREIGN KEY (\`businessId\`) REFERENCES \`businesses\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ─── court_availability ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`court_availability\` (
        \`id\`           VARCHAR(36)                                                                    NOT NULL,
        \`dayOfWeek\`    ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday')   NOT NULL,
        \`startTime\`    TIME                                                                           NOT NULL,
        \`endTime\`      TIME                                                                           NOT NULL,
        \`isAvailable\`  TINYINT(1)                                                                     NOT NULL DEFAULT 1,
        \`pricePerHour\` DECIMAL(10,2)                                                                  NULL,
        \`courtId\`      VARCHAR(36)                                                                    NOT NULL,
        INDEX \`IDX_court_availability_courtId\` (\`courtId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`court_availability\`
        ADD CONSTRAINT \`FK_court_availability_courtId\`
        FOREIGN KEY (\`courtId\`) REFERENCES \`courts\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ─── bookings ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`bookings\` (
        \`id\`                 VARCHAR(36)                                              NOT NULL,
        \`courtId\`            VARCHAR(36)                                              NOT NULL,
        \`clientId\`           VARCHAR(36)                                              NOT NULL,
        \`date\`               DATE                                                     NOT NULL,
        \`startTime\`          TIME                                                     NOT NULL,
        \`endTime\`            TIME                                                     NOT NULL,
        \`durationHours\`      DECIMAL(4,1)                                             NOT NULL,
        \`status\`             ENUM('pending','confirmed','cancelled','completed','no_show') NOT NULL DEFAULT 'pending',
        \`pricePerHour\`       DECIMAL(10,2)                                            NOT NULL,
        \`totalPrice\`         DECIMAL(10,2)                                            NOT NULL,
        \`paymentMethod\`      ENUM('nequi','transferencia')                            NOT NULL,
        \`paymentProofUrl\`    VARCHAR(255)                                             NOT NULL,
        \`isPaid\`             TINYINT(1)                                               NOT NULL DEFAULT 0,
        \`notes\`              TEXT                                                     NULL,
        \`adminNotes\`         TEXT                                                     NULL,
        \`cancelledAt\`        DATETIME                                                 NULL,
        \`cancellationReason\` TEXT                                                     NULL,
        \`cancelledBy\`        VARCHAR(255)                                             NULL,
        \`createdBy\`          VARCHAR(255)                                             NOT NULL,
        \`createdAt\`          DATETIME(6)                                              NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\`          DATETIME(6)                                              NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_bookings_courtId\`  (\`courtId\`),
        INDEX \`IDX_bookings_clientId\` (\`clientId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`bookings\`
        ADD CONSTRAINT \`FK_bookings_courtId\`
        FOREIGN KEY (\`courtId\`) REFERENCES \`courts\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`bookings\`
        ADD CONSTRAINT \`FK_bookings_clientId\`
        FOREIGN KEY (\`clientId\`) REFERENCES \`users\`(\`id\`)
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // ─── software ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE \`software\` (
        \`id\`              INT            NOT NULL AUTO_INCREMENT,
        \`nombre\`          VARCHAR(255)   NOT NULL,
        \`fecha_creacion\`  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`tags\`            TEXT           NULL,
        \`url_imagen\`      TEXT           NULL,
        \`descripcion\`     TEXT           NULL,
        \`url_aplicacion\`  VARCHAR(500)   NULL,
        \`autores\`         VARCHAR(500)   NULL,
        \`valoracion\`      DECIMAL(3,1)   NULL DEFAULT 0,
        \`estado\`          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`bookings\` DROP FOREIGN KEY \`FK_bookings_clientId\``);
    await queryRunner.query(`ALTER TABLE \`bookings\` DROP FOREIGN KEY \`FK_bookings_courtId\``);
    await queryRunner.query(`ALTER TABLE \`court_availability\` DROP FOREIGN KEY \`FK_court_availability_courtId\``);
    await queryRunner.query(`ALTER TABLE \`courts\` DROP FOREIGN KEY \`FK_courts_businessId\``);
    await queryRunner.query(`ALTER TABLE \`business_schedules\` DROP FOREIGN KEY \`FK_business_schedules_businessId\``);
    await queryRunner.query(`ALTER TABLE \`businesses\` DROP FOREIGN KEY \`FK_businesses_ownerId\``);

    await queryRunner.query(`DROP TABLE \`software\``);
    await queryRunner.query(`DROP TABLE \`bookings\``);
    await queryRunner.query(`DROP TABLE \`court_availability\``);
    await queryRunner.query(`DROP TABLE \`courts\``);
    await queryRunner.query(`DROP TABLE \`business_schedules\``);
    await queryRunner.query(`DROP TABLE \`businesses\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
