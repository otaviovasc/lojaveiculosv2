import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type DeleteObjectsOutput,
  type ListObjectsV2Output,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import {
  countR2PrefixObjects,
  deleteR2PrefixObjects,
  type R2CommandExecutor,
} from "./resetR2Adapter.js";

describe("R2 environment reset", () => {
  it("counts every page under only the exact environment prefix", async () => {
    const execute = vi
      .fn<R2CommandExecutor>()
      .mockResolvedValueOnce({
        Contents: [{ Key: "s/one" }, { Key: "s/two" }],
        IsTruncated: true,
        NextContinuationToken: "next",
      } satisfies ListObjectsV2Output)
      .mockResolvedValueOnce({
        Contents: [{ Key: "s/three" }],
        IsTruncated: false,
      } satisfies ListObjectsV2Output);

    await expect(countR2PrefixObjects(execute, "bucket", "s/")).resolves.toBe(
      3,
    );
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(ListObjectsV2Command);
    expect(execute.mock.calls[1]?.[0]).toMatchObject({
      input: { ContinuationToken: "next", Prefix: "s/" },
    });
  });

  it("deletes in batches until the prefix is empty", async () => {
    const execute = vi
      .fn<R2CommandExecutor>()
      .mockResolvedValueOnce({
        Contents: [{ Key: "s/one" }, { Key: "s/two" }],
      } satisfies ListObjectsV2Output)
      .mockResolvedValueOnce({} satisfies DeleteObjectsOutput)
      .mockResolvedValueOnce({ Contents: [] } satisfies ListObjectsV2Output);

    await expect(deleteR2PrefixObjects(execute, "bucket", "s/")).resolves.toBe(
      2,
    );
    expect(execute.mock.calls[1]?.[0]).toBeInstanceOf(DeleteObjectsCommand);
  });

  it("refuses production, root, and approximate prefixes", async () => {
    const execute = vi.fn<R2CommandExecutor>();
    await expect(countR2PrefixObjects(execute, "bucket", "p/")).rejects.toThrow(
      "exact l/ or s/",
    );
    await expect(deleteR2PrefixObjects(execute, "bucket", "")).rejects.toThrow(
      "exact l/ or s/",
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
