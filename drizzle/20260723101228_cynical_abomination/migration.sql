UPDATE `creators`
SET `document` = json_remove(
  json_set(
    `document`,
    '$.equipment',
    coalesce(
      (
        SELECT json_group_array(json_remove(value, '$.status'))
        FROM json_each(`creators`.`document`, '$.equipment')
      ),
      json('[]')
    )
  ),
  '$.indexable',
  '$.verificationStatus',
  '$.content.en.researchNote',
  '$.content.ru.researchNote',
  '$.content.en.intro',
  '$.content.ru.intro',
  '$.content.en.verdict',
  '$.content.ru.verdict'
);
--> statement-breakpoint
ALTER TABLE `creators` DROP COLUMN `indexable`;
