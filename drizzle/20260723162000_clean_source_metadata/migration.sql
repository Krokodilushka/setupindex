UPDATE `creators`
SET `document` = json_set(
  `document`,
  '$.sources',
  coalesce(
    (
      SELECT json_group_array(json_remove(value, '$.title', '$.publisher'))
      FROM json_each(`creators`.`document`, '$.sources')
    ),
    json('[]')
  )
);
